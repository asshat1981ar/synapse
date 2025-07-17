const messageQueue = require('./SimpleMessageQueue');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Agent Orchestrator manages agent lifecycle, task delegation, and workflow coordination
 */
class AgentOrchestrator {
    constructor() {
        this.activeAgents = new Map();
        this.sessionWorkflows = new Map();
        this.agentCapabilities = new Map();
        this.workflowStates = new Map();
        
        // Initialize agent capabilities
        this.initializeAgentCapabilities();
    }

    /**
     * Initialize agent capabilities and specializations
     */
    initializeAgentCapabilities() {
        const capabilities = {
            'architectrix': {
                specialization: 'system_architecture',
                capabilities: [
                    'system_design',
                    'architecture_planning',
                    'technology_selection',
                    'scalability_analysis',
                    'performance_optimization'
                ],
                preferredModels: ['gpt-4', 'claude-3-opus'],
                maxConcurrentTasks: 3,
                averageResponseTime: 15000 // 15 seconds
            },
            'code_conjurer': {
                specialization: 'code_generation',
                capabilities: [
                    'code_writing',
                    'code_review',
                    'refactoring',
                    'debugging',
                    'testing'
                ],
                preferredModels: ['gpt-4', 'claude-3-sonnet'],
                maxConcurrentTasks: 5,
                averageResponseTime: 8000 // 8 seconds
            },
            'api_architect': {
                specialization: 'api_design',
                capabilities: [
                    'api_design',
                    'endpoint_planning',
                    'documentation',
                    'integration_patterns',
                    'security_design'
                ],
                preferredModels: ['gpt-4', 'claude-3-sonnet'],
                maxConcurrentTasks: 4,
                averageResponseTime: 12000 // 12 seconds
            },
            'frontend_developer': {
                specialization: 'frontend_development',
                capabilities: [
                    'ui_development',
                    'component_design',
                    'styling',
                    'user_experience',
                    'responsive_design'
                ],
                preferredModels: ['gpt-4', 'claude-3-sonnet'],
                maxConcurrentTasks: 4,
                averageResponseTime: 10000 // 10 seconds
            },
            'backend_developer': {
                specialization: 'backend_development',
                capabilities: [
                    'server_logic',
                    'database_design',
                    'performance_optimization',
                    'security_implementation',
                    'deployment'
                ],
                preferredModels: ['gpt-4', 'claude-3-sonnet'],
                maxConcurrentTasks: 4,
                averageResponseTime: 12000 // 12 seconds
            },
            'technical_writer': {
                specialization: 'documentation',
                capabilities: [
                    'documentation',
                    'technical_writing',
                    'user_guides',
                    'api_documentation',
                    'tutorials'
                ],
                preferredModels: ['gpt-3.5-turbo', 'claude-3-haiku'],
                maxConcurrentTasks: 6,
                averageResponseTime: 6000 // 6 seconds
            }
        };

        Object.entries(capabilities).forEach(([agentId, capability]) => {
            this.agentCapabilities.set(agentId, capability);
        });
    }

    /**
     * Start a new multi-agent session
     */
    async startSession(sessionId, projectContext, userRequirement) {
        try {
            const workflow = {
                id: uuidv4(),
                sessionId,
                projectContext,
                userRequirement,
                status: 'planning',
                startTime: new Date().toISOString(),
                currentPhase: 'analysis',
                phases: ['analysis', 'planning', 'implementation', 'review', 'completion'],
                activeTasks: [],
                completedTasks: [],
                activeAgents: new Set(),
                messageHistory: [],
                state: {
                    requirements: userRequirement,
                    architecture: null,
                    implementation: null,
                    reviews: [],
                    deliverables: []
                }
            };

            this.sessionWorkflows.set(sessionId, workflow);
            this.workflowStates.set(sessionId, 'active');

            logger.info(`A2A session started: ${sessionId} with workflow: ${workflow.id}`);

            // Initialize with requirements analysis
            await this.initiateRequirementsAnalysis(sessionId, userRequirement, projectContext);

            return workflow;
        } catch (error) {
            logger.error('Error starting A2A session:', error);
            throw error;
        }
    }

    /**
     * Initiate requirements analysis phase
     */
    async initiateRequirementsAnalysis(sessionId, userRequirement, projectContext) {
        const taskId = uuidv4();
        const workflow = this.sessionWorkflows.get(sessionId);

        const analysisTask = {
            id: taskId,
            type: 'requirements_analysis',
            sessionId,
            assignedAgent: 'architectrix',
            status: 'assigned',
            priority: 10,
            dependencies: [],
            input: {
                userRequirement,
                projectContext,
                existingCode: projectContext.existingFiles || []
            },
            expectedOutput: {
                requirements: 'structured_requirements',
                architecture: 'high_level_architecture',
                recommendations: 'technology_recommendations'
            },
            deadline: new Date(Date.now() + 300000).toISOString(), // 5 minutes
            createdAt: new Date().toISOString()
        };

        workflow.activeTasks.push(analysisTask);
        workflow.activeAgents.add('architectrix');

        // Send task to Architectrix
        await messageQueue.sendMessage({
            type: 'task_assignment',
            sessionId,
            fromAgent: 'orchestrator',
            toAgent: 'architectrix',
            payload: {
                task: analysisTask,
                context: 'You are Architectrix, a senior system architect. Analyze the user requirement and provide structured requirements, high-level architecture, and technology recommendations.'
            },
            correlationId: taskId,
            priority: 10
        });

        logger.info(`Requirements analysis task assigned to Architectrix: ${taskId}`);
    }

    /**
     * Register an agent and start message subscription
     */
    async registerAgent(sessionId, agentId) {
        try {
            const capabilities = this.agentCapabilities.get(agentId);
            if (!capabilities) {
                throw new Error(`Unknown agent: ${agentId}`);
            }

            const agentInstance = {
                id: agentId,
                sessionId,
                capabilities,
                status: 'active',
                currentTasks: [],
                lastSeen: new Date().toISOString(),
                metrics: {
                    tasksCompleted: 0,
                    averageResponseTime: 0,
                    errorRate: 0
                }
            };

            this.activeAgents.set(`${sessionId}:${agentId}`, agentInstance);

            // Subscribe to messages for this agent
            await messageQueue.subscribeToMessages(
                sessionId,
                agentId,
                (message) => this.handleAgentMessage(sessionId, agentId, message)
            );

            logger.info(`Agent ${agentId} registered for session ${sessionId}`);
            return agentInstance;
        } catch (error) {
            logger.error(`Error registering agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
     * Handle incoming messages from agents
     */
    async handleAgentMessage(sessionId, agentId, message) {
        try {
            const workflow = this.sessionWorkflows.get(sessionId);
            if (!workflow) {
                logger.warn(`No workflow found for session ${sessionId}`);
                return;
            }

            // Update agent last seen
            const agentKey = `${sessionId}:${agentId}`;
            const agent = this.activeAgents.get(agentKey);
            if (agent) {
                agent.lastSeen = new Date().toISOString();
            }

            // Add to message history
            workflow.messageHistory.push({
                ...message,
                processedAt: new Date().toISOString()
            });

            // Handle different message types
            switch (message.type) {
                case 'task_completion':
                    await this.handleTaskCompletion(sessionId, agentId, message);
                    break;

                case 'task_progress':
                    await this.handleTaskProgress(sessionId, agentId, message);
                    break;

                case 'agent_question':
                    await this.handleAgentQuestion(sessionId, agentId, message);
                    break;

                case 'error_report':
                    await this.handleAgentError(sessionId, agentId, message);
                    break;

                case 'collaboration_request':
                    await this.handleCollaborationRequest(sessionId, agentId, message);
                    break;

                default:
                    logger.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            logger.error(`Error handling agent message from ${agentId}:`, error);
        }
    }

    /**
     * Handle task completion from agents
     */
    async handleTaskCompletion(sessionId, agentId, message) {
        const workflow = this.sessionWorkflows.get(sessionId);
        const { taskId, result, deliverables } = message.payload;

        // Move task from active to completed
        const taskIndex = workflow.activeTasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const task = workflow.activeTasks[taskIndex];
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
            task.result = result;
            task.deliverables = deliverables;

            workflow.completedTasks.push(task);
            workflow.activeTasks.splice(taskIndex, 1);

            // Update workflow state based on task type
            if (task.type === 'requirements_analysis') {
                workflow.state.requirements = result.requirements;
                workflow.state.architecture = result.architecture;
                workflow.currentPhase = 'planning';

                // Initiate next phase
                await this.initiateImplementationPlanning(sessionId, result);
            }

            logger.info(`Task completed: ${taskId} by ${agentId}`);
        }
    }

    /**
     * Handle task progress updates
     */
    async handleTaskProgress(sessionId, agentId, message) {
        const workflow = this.sessionWorkflows.get(sessionId);
        const { taskId, progress, status } = message.payload;

        const task = workflow.activeTasks.find(t => t.id === taskId);
        if (task) {
            task.progress = progress;
            task.status = status;
            task.lastUpdate = new Date().toISOString();

            logger.debug(`Task progress: ${taskId} - ${progress}%`);
        }
    }

    /**
     * Handle agent questions/requests for clarification
     */
    async handleAgentQuestion(sessionId, agentId, message) {
        const { question, context, urgency } = message.payload;

        // Forward question to user or other agents based on context
        await messageQueue.sendMessage({
            type: 'user_clarification_needed',
            sessionId,
            fromAgent: 'orchestrator',
            toAgent: 'user',
            payload: {
                question,
                context,
                urgency,
                requestingAgent: agentId
            },
            priority: urgency === 'high' ? 8 : 5
        });

        logger.info(`Agent question from ${agentId}: ${question}`);
    }

    /**
     * Handle agent errors
     */
    async handleAgentError(sessionId, agentId, message) {
        const { error, taskId, severity } = message.payload;

        logger.error(`Agent error from ${agentId}:`, error);

        // Implement error recovery strategies
        if (severity === 'critical') {
            // Reassign task to another agent
            await this.reassignTask(sessionId, taskId, agentId);
        }
    }

    /**
     * Handle collaboration requests between agents
     */
    async handleCollaborationRequest(sessionId, agentId, message) {
        const { targetAgent, collaborationType, context } = message.payload;

        // Forward collaboration request
        await messageQueue.sendMessage({
            type: 'collaboration_invitation',
            sessionId,
            fromAgent: agentId,
            toAgent: targetAgent,
            payload: {
                collaborationType,
                context,
                requestingAgent: agentId
            },
            priority: 7
        });

        logger.info(`Collaboration request: ${agentId} -> ${targetAgent}`);
    }

    /**
     * Initiate implementation planning phase
     */
    async initiateImplementationPlanning(sessionId, analysisResult) {
        const workflow = this.sessionWorkflows.get(sessionId);
        const { requirements, architecture } = analysisResult;

        // Determine which agents are needed for implementation
        const neededAgents = this.determineRequiredAgents(requirements, architecture);

        // Create implementation tasks
        const tasks = await this.createImplementationTasks(sessionId, requirements, architecture, neededAgents);

        // Assign tasks to agents
        for (const task of tasks) {
            await this.assignTaskToAgent(sessionId, task);
        }

        workflow.currentPhase = 'implementation';
        logger.info(`Implementation planning initiated for session ${sessionId}`);
    }

    /**
     * Determine which agents are needed based on requirements
     */
    determineRequiredAgents(requirements, architecture) {
        const agents = new Set();

        if (requirements.includes('frontend') || requirements.includes('ui')) {
            agents.add('frontend_developer');
        }
        if (requirements.includes('backend') || requirements.includes('api')) {
            agents.add('backend_developer');
        }
        if (requirements.includes('api') || requirements.includes('endpoints')) {
            agents.add('api_architect');
        }
        if (requirements.includes('documentation') || requirements.includes('docs')) {
            agents.add('technical_writer');
        }

        agents.add('code_conjurer'); // Always needed for implementation
        return Array.from(agents);
    }

    /**
     * Create implementation tasks based on analysis
     */
    async createImplementationTasks(sessionId, requirements, architecture, neededAgents) {
        const tasks = [];

        // Create tasks based on agent capabilities and requirements
        for (const agentId of neededAgents) {
            const capabilities = this.agentCapabilities.get(agentId);
            const task = {
                id: uuidv4(),
                type: `${capabilities.specialization}_implementation`,
                sessionId,
                assignedAgent: agentId,
                status: 'pending',
                priority: 7,
                dependencies: [],
                input: {
                    requirements,
                    architecture,
                    specialization: capabilities.specialization
                },
                deadline: new Date(Date.now() + 600000).toISOString(), // 10 minutes
                createdAt: new Date().toISOString()
            };

            tasks.push(task);
        }

        return tasks;
    }

    /**
     * Assign task to specific agent
     */
    async assignTaskToAgent(sessionId, task) {
        const workflow = this.sessionWorkflows.get(sessionId);
        workflow.activeTasks.push(task);
        workflow.activeAgents.add(task.assignedAgent);

        await messageQueue.sendMessage({
            type: 'task_assignment',
            sessionId,
            fromAgent: 'orchestrator',
            toAgent: task.assignedAgent,
            payload: {
                task,
                context: `You are ${task.assignedAgent}. Complete the assigned task based on your specialization.`
            },
            correlationId: task.id,
            priority: task.priority
        });

        logger.info(`Task assigned: ${task.id} to ${task.assignedAgent}`);
    }

    /**
     * Reassign task to another agent (error recovery)
     */
    async reassignTask(sessionId, taskId, failedAgent) {
        const workflow = this.sessionWorkflows.get(sessionId);
        const task = workflow.activeTasks.find(t => t.id === taskId);

        if (task) {
            // Find suitable replacement agent
            const capabilities = this.agentCapabilities.get(failedAgent);
            const replacementAgent = this.findReplacementAgent(capabilities.specialization, failedAgent);

            if (replacementAgent) {
                task.assignedAgent = replacementAgent;
                task.status = 'reassigned';
                task.reassignedAt = new Date().toISOString();
                task.previousAgent = failedAgent;

                await this.assignTaskToAgent(sessionId, task);
                logger.info(`Task reassigned: ${taskId} from ${failedAgent} to ${replacementAgent}`);
            }
        }
    }

    /**
     * Find replacement agent with similar capabilities
     */
    findReplacementAgent(specialization, excludeAgent) {
        for (const [agentId, capabilities] of this.agentCapabilities) {
            if (agentId !== excludeAgent && capabilities.specialization === specialization) {
                return agentId;
            }
        }
        return null;
    }

    /**
     * Get workflow status
     */
    getWorkflowStatus(sessionId) {
        const workflow = this.sessionWorkflows.get(sessionId);
        if (!workflow) {
            return null;
        }

        return {
            id: workflow.id,
            sessionId,
            status: workflow.status,
            currentPhase: workflow.currentPhase,
            progress: {
                total: workflow.activeTasks.length + workflow.completedTasks.length,
                completed: workflow.completedTasks.length,
                active: workflow.activeTasks.length
            },
            activeAgents: Array.from(workflow.activeAgents),
            startTime: workflow.startTime,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Stop workflow and cleanup
     */
    async stopWorkflow(sessionId) {
        const workflow = this.sessionWorkflows.get(sessionId);
        if (workflow) {
            workflow.status = 'stopped';
            workflow.endTime = new Date().toISOString();
            
            // Cleanup active agents
            for (const agentId of workflow.activeAgents) {
                this.activeAgents.delete(`${sessionId}:${agentId}`);
            }

            this.workflowStates.set(sessionId, 'stopped');
            logger.info(`Workflow stopped: ${sessionId}`);
        }
    }
}

// Export singleton instance
const agentOrchestrator = new AgentOrchestrator();

module.exports = agentOrchestrator;