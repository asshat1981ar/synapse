const messageQueue = require('../SimpleMessageQueue');
const logger = require('../../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Base Agent class that all AI agents inherit from
 */
class BaseAgent {
    constructor(agentId, specialization, capabilities) {
        this.id = agentId;
        this.specialization = specialization;
        this.capabilities = capabilities;
        this.status = 'idle';
        this.currentTasks = new Map();
        this.activeSession = null;
        this.metrics = {
            tasksCompleted: 0,
            averageResponseTime: 0,
            errorRate: 0,
            collaborations: 0
        };
        this.memory = {
            context: {},
            conversations: [],
            learnings: []
        };
        
        // AI Model configuration
        this.modelConfig = {
            preferredModel: 'gpt-4',
            temperature: 0.7,
            maxTokens: 4000,
            systemPrompt: this.getSystemPrompt()
        };
    }

    /**
     * Get system prompt for this agent (to be overridden by subclasses)
     */
    getSystemPrompt() {
        return `You are ${this.id}, a specialized AI agent with expertise in ${this.specialization}.
        
Your capabilities include: ${this.capabilities.join(', ')}.

Guidelines:
- Be precise and professional in your responses
- Ask clarifying questions when requirements are unclear
- Collaborate with other agents when needed
- Provide structured, actionable deliverables
- Always consider the project context and user requirements

When you need to collaborate with other agents, use the collaboration_request message type.
When you complete a task, use the task_completion message type with detailed results.
When you encounter issues, use the error_report message type with appropriate severity.`;
    }

    /**
     * Initialize agent for a session
     */
    async initialize(sessionId) {
        this.activeSession = sessionId;
        this.status = 'active';
        
        // Subscribe to messages for this session
        await messageQueue.subscribeToMessages(
            sessionId,
            this.id,
            (message) => this.handleMessage(message)
        );

        // Send initialization message
        await messageQueue.sendMessage({
            type: 'agent_status',
            sessionId,
            fromAgent: this.id,
            toAgent: 'orchestrator',
            payload: {
                status: 'initialized',
                capabilities: this.capabilities,
                specialization: this.specialization
            }
        });

        logger.info(`Agent ${this.id} initialized for session ${sessionId}`);
    }

    /**
     * Handle incoming messages
     */
    async handleMessage(message) {
        try {
            this.updateMemory(message);

            switch (message.type) {
                case 'task_assignment':
                    await this.handleTaskAssignment(message);
                    break;
                    
                case 'collaboration_invitation':
                    await this.handleCollaborationInvitation(message);
                    break;
                    
                case 'user_clarification':
                    await this.handleUserClarification(message);
                    break;
                    
                case 'agent_response':
                    await this.handleAgentResponse(message);
                    break;
                    
                default:
                    logger.warn(`${this.id} received unknown message type: ${message.type}`);
            }
        } catch (error) {
            logger.error(`Error handling message in ${this.id}:`, error);
            
            await this.reportError(message.sessionId, error, 'medium');
        }
    }

    /**
     * Handle task assignment
     */
    async handleTaskAssignment(message) {
        const { task, context } = message.payload;
        
        // Validate task against capabilities
        if (!this.canHandleTask(task)) {
            await this.reportError(
                message.sessionId,
                `Task ${task.id} incompatible with capabilities`,
                'low'
            );
            return;
        }

        // Add task to current tasks
        this.currentTasks.set(task.id, {
            ...task,
            startTime: new Date().toISOString(),
            status: 'in_progress'
        });

        this.status = 'working';

        // Report task progress
        await this.reportProgress(message.sessionId, task.id, 0, 'started');

        try {
            // Execute task (implemented by subclasses)
            const result = await this.executeTask(task, context);
            
            // Complete task
            await this.completeTask(message.sessionId, task.id, result);
            
        } catch (error) {
            await this.reportError(message.sessionId, error, 'high', task.id);
        }
    }

    /**
     * Check if agent can handle a specific task
     */
    canHandleTask(task) {
        const taskType = task.type.split('_')[0]; // e.g., 'frontend' from 'frontend_implementation'
        return this.capabilities.some(cap => 
            cap.includes(taskType) || 
            task.type.includes(this.specialization)
        );
    }

    /**
     * Execute task (to be implemented by subclasses)
     */
    async executeTask(task, context) {
        throw new Error('executeTask must be implemented by subclasses');
    }

    /**
     * Handle collaboration invitation
     */
    async handleCollaborationInvitation(message) {
        const { collaborationType, context, requestingAgent } = message.payload;
        
        // Accept collaboration based on availability and relevance
        const shouldAccept = this.shouldAcceptCollaboration(collaborationType, context);
        
        if (shouldAccept) {
            await messageQueue.sendMessage({
                type: 'collaboration_acceptance',
                sessionId: message.sessionId,
                fromAgent: this.id,
                toAgent: requestingAgent,
                payload: {
                    accepted: true,
                    collaborationType,
                    availableCapabilities: this.capabilities
                }
            });
            
            this.metrics.collaborations++;
        }
    }

    /**
     * Determine if agent should accept collaboration
     */
    shouldAcceptCollaboration(type, context) {
        // Simple logic - can be enhanced
        return this.status !== 'overloaded' && this.currentTasks.size < 3;
    }

    /**
     * Handle user clarification
     */
    async handleUserClarification(message) {
        const { clarification, originalQuestion } = message.payload;
        
        // Update memory with clarification
        this.memory.context.userClarifications = this.memory.context.userClarifications || [];
        this.memory.context.userClarifications.push({
            question: originalQuestion,
            answer: clarification,
            timestamp: new Date().toISOString()
        });
        
        // Continue with pending tasks that were waiting for clarification
        await this.processPendingTasks();
    }

    /**
     * Process tasks that were waiting for clarification
     */
    async processPendingTasks() {
        for (const [taskId, task] of this.currentTasks) {
            if (task.status === 'waiting_for_clarification') {
                task.status = 'in_progress';
                await this.reportProgress(this.activeSession, taskId, 50, 'resumed');
                
                // Continue task execution
                try {
                    const result = await this.executeTask(task, task.context);
                    await this.completeTask(this.activeSession, taskId, result);
                } catch (error) {
                    await this.reportError(this.activeSession, error, 'high', taskId);
                }
            }
        }
    }

    /**
     * Ask for clarification from user
     */
    async requestClarification(sessionId, question, context, urgency = 'medium') {
        await messageQueue.sendMessage({
            type: 'agent_question',
            sessionId,
            fromAgent: this.id,
            toAgent: 'orchestrator',
            payload: {
                question,
                context,
                urgency
            },
            priority: urgency === 'high' ? 8 : 5
        });
    }

    /**
     * Request collaboration with another agent
     */
    async requestCollaboration(sessionId, targetAgent, collaborationType, context) {
        await messageQueue.sendMessage({
            type: 'collaboration_request',
            sessionId,
            fromAgent: this.id,
            toAgent: 'orchestrator',
            payload: {
                targetAgent,
                collaborationType,
                context
            }
        });
    }

    /**
     * Report task progress
     */
    async reportProgress(sessionId, taskId, progress, status) {
        await messageQueue.sendMessage({
            type: 'task_progress',
            sessionId,
            fromAgent: this.id,
            toAgent: 'orchestrator',
            payload: {
                taskId,
                progress,
                status
            }
        });
    }

    /**
     * Complete a task
     */
    async completeTask(sessionId, taskId, result) {
        const task = this.currentTasks.get(taskId);
        if (!task) {
            return;
        }

        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.result = result;

        // Calculate response time
        const responseTime = Date.now() - new Date(task.startTime).getTime();
        this.updateMetrics(responseTime, true);

        // Send completion message
        await messageQueue.sendMessage({
            type: 'task_completion',
            sessionId,
            fromAgent: this.id,
            toAgent: 'orchestrator',
            payload: {
                taskId,
                result,
                deliverables: result.deliverables || [],
                responseTime
            },
            correlationId: taskId
        });

        // Remove from current tasks
        this.currentTasks.delete(taskId);
        
        // Update status
        this.status = this.currentTasks.size > 0 ? 'working' : 'idle';

        logger.info(`Task completed by ${this.id}: ${taskId}`);
    }

    /**
     * Report error
     */
    async reportError(sessionId, error, severity, taskId = null) {
        this.updateMetrics(0, false);

        await messageQueue.sendMessage({
            type: 'error_report',
            sessionId,
            fromAgent: this.id,
            toAgent: 'orchestrator',
            payload: {
                error: error.message || error,
                severity,
                taskId,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Update agent metrics
     */
    updateMetrics(responseTime, success) {
        if (success) {
            this.metrics.tasksCompleted++;
            
            // Update average response time
            this.metrics.averageResponseTime = (
                (this.metrics.averageResponseTime * (this.metrics.tasksCompleted - 1) + responseTime) /
                this.metrics.tasksCompleted
            );
        }
        
        // Update error rate
        const totalTasks = this.metrics.tasksCompleted + (success ? 0 : 1);
        const errorCount = totalTasks - this.metrics.tasksCompleted;
        this.metrics.errorRate = (errorCount / totalTasks) * 100;
    }

    /**
     * Update agent memory
     */
    updateMemory(message) {
        // Add to conversation history
        this.memory.conversations.push({
            timestamp: new Date().toISOString(),
            type: message.type,
            fromAgent: message.fromAgent,
            content: message.payload
        });

        // Keep only last 50 conversations
        if (this.memory.conversations.length > 50) {
            this.memory.conversations = this.memory.conversations.slice(-50);
        }

        // Extract context from messages
        if (message.type === 'task_assignment') {
            this.memory.context.currentProject = message.payload.task.input;
        }
    }

    /**
     * Get agent status
     */
    getStatus() {
        return {
            id: this.id,
            specialization: this.specialization,
            capabilities: this.capabilities,
            status: this.status,
            currentTasks: this.currentTasks.size,
            activeSession: this.activeSession,
            metrics: this.metrics,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Shutdown agent
     */
    async shutdown() {
        this.status = 'shutting_down';
        
        // Complete or cancel current tasks
        for (const [taskId, task] of this.currentTasks) {
            if (task.status === 'in_progress') {
                await this.reportError(
                    this.activeSession,
                    'Agent shutting down',
                    'medium',
                    taskId
                );
            }
        }
        
        this.currentTasks.clear();
        this.status = 'offline';
        
        logger.info(`Agent ${this.id} shut down`);
    }

    /**
     * Generate AI response using configured model
     */
    async generateAIResponse(prompt, context = {}) {
        // This will be implemented when we integrate real AI models
        // For now, return a placeholder
        return {
            response: `AI response from ${this.id} for: ${prompt}`,
            model: this.modelConfig.preferredModel,
            tokens: 100,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = BaseAgent;