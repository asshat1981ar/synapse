const messageQueue = require('./SimpleMessageQueue');
const agentOrchestrator = require('./AgentOrchestrator');
const ArchitectrixAgent = require('./agents/ArchitectrixAgent');
const CodeConjurerAgent = require('./agents/CodeConjurerAgent');
const logger = require('../../utils/logger');

/**
 * A2A Service - Main service for Agent-to-Agent communication
 * Manages agent lifecycle and coordinates multi-agent workflows
 */
class A2AService {
    constructor() {
        this.agents = new Map();
        this.activeAgents = new Map();
        this.isInitialized = false;
        
        // Initialize available agents
        this.initializeAgents();
    }

    /**
     * Initialize all available agents
     */
    initializeAgents() {
        this.agents.set('architectrix', new ArchitectrixAgent());
        this.agents.set('code_conjurer', new CodeConjurerAgent());
        
        // Add other agents as they're implemented
        // this.agents.set('api_architect', new ApiArchitectAgent());
        // this.agents.set('frontend_developer', new FrontendDeveloperAgent());
        // this.agents.set('backend_developer', new BackendDeveloperAgent());
        // this.agents.set('technical_writer', new TechnicalWriterAgent());
        
        logger.info(`Initialized ${this.agents.size} agents`);
    }

    /**
     * Initialize A2A service
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize message queue
            await messageQueue.connect();
            
            // Initialize orchestrator
            // Agent orchestrator is already initialized as singleton
            
            this.isInitialized = true;
            logger.info('A2A Service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize A2A Service:', error);
            throw error;
        }
    }

    /**
     * Start a new multi-agent session
     */
    async startSession(sessionId, projectContext, userRequirement) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Start orchestrator workflow
            const workflow = await agentOrchestrator.startSession(
                sessionId,
                projectContext,
                userRequirement
            );

            // Activate required agents for this session
            await this.activateAgentsForSession(sessionId, workflow);

            logger.info(`A2A session started: ${sessionId}`);
            return workflow;
        } catch (error) {
            logger.error(`Failed to start A2A session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Activate agents for a specific session
     */
    async activateAgentsForSession(sessionId, workflow) {
        const requiredAgents = this.determineRequiredAgents(workflow);
        
        for (const agentId of requiredAgents) {
            const agent = this.agents.get(agentId);
            if (agent) {
                await agent.initialize(sessionId);
                await agentOrchestrator.registerAgent(sessionId, agentId);
                
                this.activeAgents.set(`${sessionId}:${agentId}`, agent);
                logger.info(`Agent ${agentId} activated for session ${sessionId}`);
            } else {
                logger.warn(`Agent ${agentId} not found`);
            }
        }
    }

    /**
     * Determine which agents are required for a workflow
     */
    determineRequiredAgents(workflow) {
        const requiredAgents = new Set(['architectrix']); // Always start with architectrix
        
        const requirement = workflow.userRequirement.toLowerCase();
        
        // Add agents based on requirement analysis
        if (requirement.includes('code') || requirement.includes('implement')) {
            requiredAgents.add('code_conjurer');
        }
        
        if (requirement.includes('frontend') || requirement.includes('ui')) {
            requiredAgents.add('frontend_developer');
        }
        
        if (requirement.includes('backend') || requirement.includes('api')) {
            requiredAgents.add('backend_developer');
        }
        
        if (requirement.includes('api') || requirement.includes('endpoint')) {
            requiredAgents.add('api_architect');
        }
        
        if (requirement.includes('documentation') || requirement.includes('docs')) {
            requiredAgents.add('technical_writer');
        }
        
        return Array.from(requiredAgents).filter(agentId => this.agents.has(agentId));
    }

    /**
     * Send message to specific agent
     */
    async sendMessageToAgent(sessionId, agentId, message) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const messageId = await messageQueue.sendMessage({
                type: message.type,
                sessionId,
                fromAgent: 'user',
                toAgent: agentId,
                payload: message.payload,
                priority: message.priority || 5
            });

            logger.info(`Message sent to agent ${agentId}: ${messageId}`);
            return messageId;
        } catch (error) {
            logger.error(`Failed to send message to agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
     * Broadcast message to all agents in session
     */
    async broadcastMessage(sessionId, message) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const sessionAgents = Array.from(this.activeAgents.keys())
            .filter(key => key.startsWith(sessionId))
            .map(key => key.split(':')[1]);

        const messageIds = [];
        
        for (const agentId of sessionAgents) {
            try {
                const messageId = await this.sendMessageToAgent(sessionId, agentId, message);
                messageIds.push(messageId);
            } catch (error) {
                logger.error(`Failed to broadcast to agent ${agentId}:`, error);
            }
        }

        return messageIds;
    }

    /**
     * Get session workflow status
     */
    getSessionStatus(sessionId) {
        try {
            const workflow = agentOrchestrator.getWorkflowStatus(sessionId);
            
            if (!workflow) {
                return null;
            }

            // Add agent statuses
            const agentStatuses = {};
            Array.from(this.activeAgents.keys())
                .filter(key => key.startsWith(sessionId))
                .forEach(key => {
                    const agentId = key.split(':')[1];
                    const agent = this.activeAgents.get(key);
                    agentStatuses[agentId] = agent ? agent.getStatus() : { status: 'unknown' };
                });

            return {
                ...workflow,
                agents: agentStatuses,
                messageQueueStatus: this.isInitialized ? 'connected' : 'disconnected'
            };
        } catch (error) {
            logger.error(`Failed to get session status for ${sessionId}:`, error);
            return null;
        }
    }

    /**
     * Get message history for session
     */
    async getMessageHistory(sessionId, limit = 50) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            return await messageQueue.getMessageHistory(sessionId, limit);
        } catch (error) {
            logger.error(`Failed to get message history for ${sessionId}:`, error);
            return [];
        }
    }

    /**
     * Stop session and cleanup
     */
    async stopSession(sessionId) {
        try {
            // Stop orchestrator workflow
            await agentOrchestrator.stopWorkflow(sessionId);

            // Deactivate agents
            const sessionAgentKeys = Array.from(this.activeAgents.keys())
                .filter(key => key.startsWith(sessionId));

            for (const key of sessionAgentKeys) {
                const agent = this.activeAgents.get(key);
                if (agent) {
                    await agent.shutdown();
                    this.activeAgents.delete(key);
                }
            }

            logger.info(`A2A session stopped: ${sessionId}`);
        } catch (error) {
            logger.error(`Failed to stop A2A session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Get all active sessions
     */
    getActiveSessions() {
        const sessions = new Set();
        
        Array.from(this.activeAgents.keys()).forEach(key => {
            const sessionId = key.split(':')[0];
            sessions.add(sessionId);
        });

        return Array.from(sessions).map(sessionId => ({
            sessionId,
            status: this.getSessionStatus(sessionId)
        }));
    }

    /**
     * Get available agents
     */
    getAvailableAgents() {
        const agents = {};
        
        this.agents.forEach((agent, agentId) => {
            agents[agentId] = {
                id: agentId,
                specialization: agent.specialization,
                capabilities: agent.capabilities,
                status: agent.status
            };
        });

        return agents;
    }

    /**
     * Get agent performance metrics
     */
    getAgentMetrics(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return null;
        }

        return {
            agentId,
            metrics: agent.metrics,
            status: agent.status,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Get system health status
     */
    async getHealthStatus() {
        try {
            const status = {
                service: 'A2A Service',
                status: this.isInitialized ? 'healthy' : 'initializing',
                messageQueue: 'unknown',
                agents: {
                    total: this.agents.size,
                    active: this.activeAgents.size,
                    available: Array.from(this.agents.keys())
                },
                activeSessions: this.getActiveSessions().length,
                timestamp: new Date().toISOString()
            };

            // Check message queue health
            if (this.isInitialized) {
                try {
                    // Simple ping to Redis
                    await messageQueue.redis.ping();
                    status.messageQueue = 'healthy';
                } catch (error) {
                    status.messageQueue = 'unhealthy';
                    status.status = 'degraded';
                }
            }

            return status;
        } catch (error) {
            logger.error('Failed to get A2A health status:', error);
            return {
                service: 'A2A Service',
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        try {
            // Stop all active sessions
            const activeSessions = this.getActiveSessions();
            for (const session of activeSessions) {
                await this.stopSession(session.sessionId);
            }

            // Disconnect message queue
            await messageQueue.disconnect();

            this.isInitialized = false;
            logger.info('A2A Service shut down successfully');
        } catch (error) {
            logger.error('Error during A2A Service shutdown:', error);
            throw error;
        }
    }
}

// Export singleton instance
const a2aService = new A2AService();

module.exports = a2aService;