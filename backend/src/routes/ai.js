const express = require('express');
const { body, param } = require('express-validator');
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation rules
const createSessionValidation = [
  body('projectId').isUUID().withMessage('Invalid project ID'),
  body('agents').isArray().withMessage('Agents must be an array'),
  body('context').optional().isObject().withMessage('Context must be an object')
];

const sendMessageValidation = [
  body('message').trim().isLength({ min: 1 }).withMessage('Message cannot be empty'),
  body('messageType').isIn(['user_input', 'system_command']).withMessage('Invalid message type'),
  body('targetAgent').optional().isString()
];

const sessionIdValidation = [
  param('sessionId').isUUID().withMessage('Invalid session ID')
];

// Routes
router.post('/sessions', createSessionValidation, aiController.createSession);
router.get('/sessions/:sessionId', sessionIdValidation, aiController.getSession);
router.post('/sessions/:sessionId/messages', [...sessionIdValidation, ...sendMessageValidation], aiController.sendMessage);
router.get('/sessions/:sessionId/messages', sessionIdValidation, aiController.getMessages);
router.delete('/sessions/:sessionId', sessionIdValidation, aiController.deleteSession);

// Agent management
router.get('/agents', aiController.getAvailableAgents);
router.get('/models', aiController.getAvailableModels);

// Code execution
router.post('/execute', aiController.executeCode);
router.get('/execute/:executionId', aiController.getExecutionResult);

module.exports = router;