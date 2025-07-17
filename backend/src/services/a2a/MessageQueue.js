const redis = require('redis');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

class MessageQueue {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.consumers = new Map();
        this.messageHandlers = new Map();
    }

    async connect() {
        if (this.isConnected) {
            return;
        }

        try {
            this.redis = redis.createClient({
                url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
            });

            this.redis.on('connect', () => {
                logger.info('Redis connected for A2A message queue');
                this.isConnected = true;
            });

            this.redis.on('error', (err) => {
                logger.error('Redis connection error:', err);
                this.isConnected = false;
            });

            await this.redis.connect();
            await this.redis.ping();
            logger.info('A2A Message Queue initialized');
        } catch (error) {
            logger.error('Failed to connect to Redis for A2A:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.redis) {
            await this.redis.disconnect();
            this.isConnected = false;
            logger.info('A2A Message Queue disconnected');
        }
    }

    /**
     * Send a message to an agent or broadcast to multiple agents
     * @param {Object} message - The message object
     * @param {string} message.type - Message type (task, response, status, etc.)
     * @param {string} message.sessionId - AI session ID
     * @param {string} message.fromAgent - Sender agent ID
     * @param {string|Array} message.toAgent - Recipient agent ID(s)
     * @param {Object} message.payload - Message payload
     * @param {string} [message.correlationId] - For tracking request-response pairs
     * @param {number} [message.priority] - Message priority (0-10, 10 = highest)
     * @param {number} [message.ttl] - Time to live in seconds
     */
    async sendMessage(message) {
        if (!this.isConnected) {
            await this.connect();
        }

        const messageId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const enrichedMessage = {
            id: messageId,
            timestamp,
            type: message.type,
            sessionId: message.sessionId,
            fromAgent: message.fromAgent,
            toAgent: message.toAgent,
            payload: message.payload,
            correlationId: message.correlationId || messageId,
            priority: message.priority || 5,
            ttl: message.ttl || 300, // 5 minutes default
            status: 'sent',
            retryCount: 0,
            maxRetries: 3
        };

        try {
            // Send to individual agents or broadcast
            const recipients = Array.isArray(message.toAgent) ? message.toAgent : [message.toAgent];
            
            for (const recipient of recipients) {
                const streamKey = `a2a:${message.sessionId}:${recipient}`;
                
                await this.redis.xadd(
                    streamKey,
                    '*',
                    'message', JSON.stringify(enrichedMessage)
                );

                // Add to global message log for debugging/monitoring
                await this.redis.xadd(
                    `a2a:log:${message.sessionId}`,
                    '*',
                    'event', 'message_sent',
                    'messageId', messageId,
                    'fromAgent', message.fromAgent,
                    'toAgent', recipient,
                    'type', message.type
                );
            }

            logger.info(`A2A message sent: ${messageId} from ${message.fromAgent} to ${recipients.join(', ')}`);
            return messageId;
        } catch (error) {
            logger.error('Failed to send A2A message:', error);
            throw error;
        }
    }

    /**
     * Subscribe to messages for a specific agent
     * @param {string} sessionId - AI session ID
     * @param {string} agentId - Agent ID to subscribe for
     * @param {Function} messageHandler - Callback function for handling messages
     */
    async subscribeToMessages(sessionId, agentId, messageHandler) {
        if (!this.isConnected) {
            await this.connect();
        }

        const streamKey = `a2a:${sessionId}:${agentId}`;
        const consumerGroup = `${agentId}_group`;
        const consumerId = `${agentId}_${Date.now()}`;

        try {
            // Create consumer group if it doesn't exist
            try {
                await this.redis.xgroup('CREATE', streamKey, consumerGroup, '0', 'MKSTREAM');
            } catch (error) {
                if (!error.message.includes('BUSYGROUP')) {
                    throw error;
                }
            }

            // Store handler for this consumer
            this.messageHandlers.set(consumerId, messageHandler);

            // Start consuming messages
            this.consumeMessages(streamKey, consumerGroup, consumerId);

            logger.info(`Agent ${agentId} subscribed to A2A messages for session ${sessionId}`);
            return consumerId;
        } catch (error) {
            logger.error(`Failed to subscribe agent ${agentId} to A2A messages:`, error);
            throw error;
        }
    }

    /**
     * Internal method to consume messages from Redis Streams
     */
    async consumeMessages(streamKey, consumerGroup, consumerId) {
        const consumer = async () => {
            try {
                const results = await this.redis.xreadgroup(
                    'GROUP', consumerGroup, consumerId,
                    'COUNT', 1,
                    'BLOCK', 1000, // Block for 1 second
                    'STREAMS', streamKey, '>'
                );

                if (results && results.length > 0) {
                    const [stream, messages] = results[0];
                    
                    for (const [messageId, fields] of messages) {
                        const messageData = JSON.parse(fields[1]); // fields[1] is the message value
                        
                        // Check if message has expired
                        const messageAge = (Date.now() - new Date(messageData.timestamp)) / 1000;
                        if (messageAge > messageData.ttl) {
                            logger.warn(`Message ${messageData.id} expired, skipping`);
                            await this.redis.xack(streamKey, consumerGroup, messageId);
                            continue;
                        }

                        // Process message
                        const handler = this.messageHandlers.get(consumerId);
                        if (handler) {
                            try {
                                await handler(messageData);
                                
                                // Acknowledge message processing
                                await this.redis.xack(streamKey, consumerGroup, messageId);
                                
                                logger.debug(`A2A message processed: ${messageData.id}`);
                            } catch (handlerError) {
                                logger.error(`Error processing A2A message ${messageData.id}:`, handlerError);
                                
                                // Implement retry logic
                                await this.retryMessage(streamKey, consumerGroup, messageId, messageData);
                            }
                        }
                    }
                }
            } catch (error) {
                if (error.message !== 'Connection is closed.') {
                    logger.error('Error consuming A2A messages:', error);
                }
            }

            // Continue consuming if still connected
            if (this.isConnected) {
                setImmediate(consumer);
            }
        };

        consumer();
    }

    /**
     * Retry failed message processing
     */
    async retryMessage(streamKey, consumerGroup, messageId, messageData) {
        try {
            messageData.retryCount = (messageData.retryCount || 0) + 1;
            
            if (messageData.retryCount < messageData.maxRetries) {
                // Exponential backoff
                const delay = Math.pow(2, messageData.retryCount) * 1000;
                
                setTimeout(async () => {
                    await this.redis.xadd(
                        streamKey,
                        '*',
                        'message', JSON.stringify(messageData)
                    );
                    
                    // Acknowledge original message
                    await this.redis.xack(streamKey, consumerGroup, messageId);
                }, delay);
                
                logger.info(`Retrying A2A message ${messageData.id} (attempt ${messageData.retryCount})`);
            } else {
                logger.error(`A2A message ${messageData.id} failed after ${messageData.maxRetries} attempts`);
                
                // Move to dead letter queue
                await this.redis.xadd(
                    `a2a:dlq:${messageData.sessionId}`,
                    '*',
                    'message', JSON.stringify(messageData),
                    'failedAt', new Date().toISOString()
                );
                
                // Acknowledge message
                await this.redis.xack(streamKey, consumerGroup, messageId);
            }
        } catch (error) {
            logger.error('Error retrying A2A message:', error);
        }
    }

    /**
     * Get message history for a session
     */
    async getMessageHistory(sessionId, limit = 50) {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            const results = await this.redis.xrevrange(
                `a2a:log:${sessionId}`,
                '+', '-',
                'COUNT', limit
            );

            return results.map(([id, fields]) => ({
                id,
                timestamp: id.split('-')[0],
                ...this.parseRedisFields(fields)
            }));
        } catch (error) {
            logger.error('Error getting A2A message history:', error);
            return [];
        }
    }

    /**
     * Parse Redis stream fields into object
     */
    parseRedisFields(fields) {
        const result = {};
        for (let i = 0; i < fields.length; i += 2) {
            result[fields[i]] = fields[i + 1];
        }
        return result;
    }

    /**
     * Clean up expired messages (should be run periodically)
     */
    async cleanupExpiredMessages() {
        // Implementation for cleanup job
        logger.info('A2A message cleanup completed');
    }
}

// Export singleton instance
const messageQueue = new MessageQueue();

module.exports = messageQueue;