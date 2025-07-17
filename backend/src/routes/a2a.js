const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const a2aService = require('../services/a2a/A2AService');
const logger = require('../utils/logger');

/**
 * A2A API Routes
 * Endpoints for managing Agent-to-Agent communication
 */

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

/**
 * POST /api/v1/a2a/sessions
 * Start a new A2A session
 */
router.post('/sessions',
    authMiddleware,
    [
        body('projectContext').isObject().withMessage('Project context is required'),
        body('userRequirement').isString().isLength({ min: 1 }).withMessage('User requirement is required')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { projectContext, userRequirement } = req.body;
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            
            // Add user context
            const enrichedContext = {
                ...projectContext,
                userId: req.user.id,
                userEmail: req.user.email,
                timestamp: new Date().toISOString()
            };

            const workflow = await a2aService.startSession(sessionId, enrichedContext, userRequirement);
            
            logger.info(`A2A session started by user ${req.user.id}: ${sessionId}`);
            
            res.status(201).json({
                success: true,
                data: {
                    sessionId,
                    workflow,
                    message: 'A2A session started successfully'
                }
            });
        } catch (error) {
            logger.error('Error starting A2A session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start A2A session'
            });
        }
    }
);

/**
 * GET /api/v1/a2a/sessions/:sessionId
 * Get session status and workflow information
 */
router.get('/sessions/:sessionId',
    authMiddleware,
    [
        param('sessionId').isString().notEmpty().withMessage('Session ID is required')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const status = a2aService.getSessionStatus(sessionId);
            
            if (!status) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            logger.error('Error getting session status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get session status'
            });
        }
    }
);

/**
 * POST /api/v1/a2a/sessions/:sessionId/messages
 * Send message to agents in session
 */
router.post('/sessions/:sessionId/messages',
    authMiddleware,
    [
        param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
        body('type').isString().isIn(['user_input', 'clarification', 'command']).withMessage('Valid message type is required'),
        body('content').isString().isLength({ min: 1 }).withMessage('Message content is required'),
        body('targetAgent').optional().isString().withMessage('Target agent must be a string'),
        body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1 and 10')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const { type, content, targetAgent, priority = 5 } = req.body;
            
            const message = {
                type,
                payload: {
                    content,
                    userId: req.user.id,
                    timestamp: new Date().toISOString()
                },
                priority
            };

            let messageId;
            
            if (targetAgent) {
                // Send to specific agent
                messageId = await a2aService.sendMessageToAgent(sessionId, targetAgent, message);
            } else {
                // Broadcast to all agents
                const messageIds = await a2aService.broadcastMessage(sessionId, message);
                messageId = messageIds;
            }

            res.json({
                success: true,
                data: {
                    messageId,
                    message: targetAgent ? `Message sent to ${targetAgent}` : 'Message broadcasted to all agents'
                }
            });
        } catch (error) {
            logger.error('Error sending message to agents:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send message'
            });
        }
    }
);

/**
 * GET /api/v1/a2a/sessions/:sessionId/messages
 * Get message history for session
 */
router.get('/sessions/:sessionId/messages',
    authMiddleware,
    [
        param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const limit = parseInt(req.query.limit) || 50;
            
            const messages = await a2aService.getMessageHistory(sessionId, limit);
            
            res.json({
                success: true,
                data: {
                    sessionId,
                    messages,
                    count: messages.length
                }
            });
        } catch (error) {
            logger.error('Error getting message history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get message history'
            });
        }
    }
);

/**
 * DELETE /api/v1/a2a/sessions/:sessionId
 * Stop and cleanup session
 */
router.delete('/sessions/:sessionId',
    authMiddleware,
    [
        param('sessionId').isString().notEmpty().withMessage('Session ID is required')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            
            await a2aService.stopSession(sessionId);
            
            logger.info(`A2A session stopped by user ${req.user.id}: ${sessionId}`);
            
            res.json({
                success: true,
                message: 'Session stopped successfully'
            });
        } catch (error) {
            logger.error('Error stopping session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to stop session'
            });
        }
    }
);

/**
 * GET /api/v1/a2a/sessions
 * Get all active sessions
 */
router.get('/sessions',
    authMiddleware,
    async (req, res) => {
        try {
            const sessions = a2aService.getActiveSessions();
            
            res.json({
                success: true,
                data: {
                    sessions,
                    count: sessions.length
                }
            });
        } catch (error) {
            logger.error('Error getting active sessions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get active sessions'
            });
        }
    }
);

/**
 * GET /api/v1/a2a/agents
 * Get available agents
 */
router.get('/agents',
    authMiddleware,
    async (req, res) => {
        try {
            const agents = a2aService.getAvailableAgents();
            
            res.json({
                success: true,
                data: agents
            });
        } catch (error) {
            logger.error('Error getting available agents:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get available agents'
            });
        }
    }
);

/**
 * GET /api/v1/a2a/agents/:agentId/metrics
 * Get agent performance metrics
 */
router.get('/agents/:agentId/metrics',
    authMiddleware,
    [
        param('agentId').isString().notEmpty().withMessage('Agent ID is required')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { agentId } = req.params;
            const metrics = a2aService.getAgentMetrics(agentId);
            
            if (!metrics) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent not found'
                });
            }

            res.json({
                success: true,
                data: metrics
            });
        } catch (error) {
            logger.error('Error getting agent metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get agent metrics'
            });
        }
    }
);

/**
 * GET /api/v1/a2a/health
 * Get A2A system health status
 */
router.get('/health',
    authMiddleware,
    async (req, res) => {
        try {
            const health = await a2aService.getHealthStatus();
            
            const statusCode = health.status === 'healthy' ? 200 : 503;
            
            res.status(statusCode).json({
                success: health.status === 'healthy',
                data: health
            });
        } catch (error) {
            logger.error('Error getting A2A health status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get health status'
            });
        }
    }
);

/**
 * POST /api/v1/a2a/initialize
 * Initialize A2A service (admin endpoint)
 */
router.post('/initialize',
    authMiddleware,
    async (req, res) => {
        try {
            await a2aService.initialize();
            
            res.json({
                success: true,
                message: 'A2A service initialized successfully'
            });
        } catch (error) {
            logger.error('Error initializing A2A service:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to initialize A2A service'
            });
        }
    }
);

module.exports = router;