const redis = require('redis');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Simplified Message Queue using Redis pub/sub
 * This is a simpler implementation for MVP that doesn't use Redis Streams
 */
class SimpleMessageQueue {
    constructor() {
        this.redis = null;
        this.subscriber = null;
        this.isConnected = false;
        this.messageHandlers = new Map();
    }

    async connect() {
        if (this.isConnected) {
            return;
        }

        try {
            this.redis = redis.createClient({
                url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`
            });

            this.subscriber = this.redis.duplicate();

            this.redis.on('connect', () => {
                logger.info('Redis connected for A2A message queue');
            });

            this.redis.on('error', (err) => {
                logger.error('Redis connection error:', err);
                this.isConnected = false;
            });

            await this.redis.connect();
            await this.subscriber.connect();
            await this.redis.ping();
            
            this.isConnected = true;
            logger.info('A2A Message Queue initialized');
        } catch (error) {
            logger.error('Failed to connect to Redis for A2A:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.redis) {
            await this.redis.disconnect();
            await this.subscriber.disconnect();
            this.isConnected = false;
            logger.info('A2A Message Queue disconnected');
        }
    }

    /**
     * Send a message to an agent or broadcast to multiple agents
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
            status: 'sent'
        };

        try {
            // Send to individual agents or broadcast
            const recipients = Array.isArray(message.toAgent) ? message.toAgent : [message.toAgent];
            
            for (const recipient of recipients) {
                const channel = `a2a:${message.sessionId}:${recipient}`;
                
                await this.redis.publish(channel, JSON.stringify(enrichedMessage));
                
                // Store in message history
                await this.redis.lPush(
                    `a2a:history:${message.sessionId}`,
                    JSON.stringify({
                        event: 'message_sent',
                        messageId,
                        fromAgent: message.fromAgent,
                        toAgent: recipient,
                        type: message.type,
                        timestamp
                    })
                );
                
                // Expire history after 24 hours
                await this.redis.expire(`a2a:history:${message.sessionId}`, 86400);
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
     */
    async subscribeToMessages(sessionId, agentId, messageHandler) {
        if (!this.isConnected) {
            await this.connect();
        }

        const channel = `a2a:${sessionId}:${agentId}`;
        const consumerId = `${agentId}_${Date.now()}`;

        try {
            // Store handler for this consumer
            this.messageHandlers.set(consumerId, messageHandler);

            // Subscribe to the channel
            await this.subscriber.subscribe(channel, (message) => {
                try {
                    const messageData = JSON.parse(message);
                    
                    // Check if message has expired
                    const messageAge = (Date.now() - new Date(messageData.timestamp)) / 1000;
                    if (messageAge > messageData.ttl) {
                        logger.warn(`Message ${messageData.id} expired, skipping`);
                        return;
                    }

                    // Process message
                    const handler = this.messageHandlers.get(consumerId);
                    if (handler) {
                        handler(messageData);
                        logger.debug(`A2A message processed: ${messageData.id}`);
                    }
                } catch (error) {
                    logger.error(`Error processing A2A message:`, error);
                }
            });

            logger.info(`Agent ${agentId} subscribed to A2A messages for session ${sessionId}`);
            return consumerId;
        } catch (error) {
            logger.error(`Failed to subscribe agent ${agentId} to A2A messages:`, error);
            throw error;
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
            const messages = await this.redis.lRange(
                `a2a:history:${sessionId}`,
                0, limit - 1
            );

            return messages.map(message => JSON.parse(message));
        } catch (error) {
            logger.error('Error getting A2A message history:', error);
            return [];
        }
    }

    /**
     * Clean up expired messages (simplified version)
     */
    async cleanupExpiredMessages() {
        logger.info('A2A message cleanup completed (simplified)');
    }
}

// Export singleton instance
const simpleMessageQueue = new SimpleMessageQueue();

module.exports = simpleMessageQueue;