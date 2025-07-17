const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Temporary in-memory storage (replace with database later)
const sessions = new Map();
const messages = new Map();
const executions = new Map();

// Mock AI agents and models data
const availableAgents = [
  {
    id: 'architectrix',
    name: 'Architectrix',
    description: 'System architecture and design specialist',
    capabilities: ['architecture', 'system_design', 'technical_planning'],
    isActive: true
  },
  {
    id: 'code_conjurer',
    name: 'Code Conjurer',
    description: 'Code generation and implementation expert',
    capabilities: ['code_generation', 'debugging', 'optimization'],
    isActive: true
  },
  {
    id: 'ui_designer',
    name: 'UI Designer',
    description: 'User interface and experience designer',
    capabilities: ['ui_design', 'ux_design', 'prototyping'],
    isActive: true
  }
];

const availableModels = [
  {
    id: 'gpt-4',
    provider: 'openai',
    name: 'GPT-4',
    capabilities: ['text', 'code', 'reasoning'],
    pricing: { input: 30, output: 60 },
    isAvailable: true
  },
  {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    name: 'GPT-3.5 Turbo',
    capabilities: ['text', 'code'],
    pricing: { input: 1, output: 2 },
    isAvailable: true
  },
  {
    id: 'claude-3-sonnet',
    provider: 'anthropic',
    name: 'Claude 3 Sonnet',
    capabilities: ['text', 'code', 'analysis'],
    pricing: { input: 3, output: 15 },
    isAvailable: true
  }
];

const createSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { projectId, agents, context } = req.body;
    const userId = req.user.id;

    // Validate agents exist
    const validAgents = agents.filter(agentId => 
      availableAgents.some(agent => agent.id === agentId && agent.isActive)
    );

    if (validAgents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid agents specified'
      });
    }

    const session = {
      id: uuidv4(),
      userId,
      projectId,
      activeAgents: validAgents,
      context: context || {},
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      status: 'active'
    };

    sessions.set(session.id, session);

    logger.info(`AI session created: ${session.id} for project ${projectId}`);

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Create session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create AI session'
    });
  }
};

const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session'
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { sessionId } = req.params;
    const { message, messageType, targetAgent } = req.body;
    const userId = req.user.id;

    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Create user message
    const userMessage = {
      id: uuidv4(),
      sessionId,
      senderType: 'user',
      senderId: userId,
      content: message,
      messageType,
      targetAgent,
      createdAt: new Date().toISOString()
    };

    messages.set(userMessage.id, userMessage);

    // Simulate AI response (replace with actual AI integration)
    const aiResponse = await simulateAIResponse(message, targetAgent || session.activeAgents[0]);
    
    const aiMessage = {
      id: uuidv4(),
      sessionId,
      senderType: 'agent',
      senderId: targetAgent || session.activeAgents[0],
      content: aiResponse,
      messageType: 'response',
      metadata: {
        model: 'gpt-3.5-turbo',
        tokens: Math.floor(Math.random() * 1000) + 100,
        responseTime: Math.floor(Math.random() * 2000) + 500
      },
      createdAt: new Date().toISOString()
    };

    messages.set(aiMessage.id, aiMessage);

    // Update session activity
    session.lastActivity = new Date().toISOString();
    sessions.set(sessionId, session);

    res.json({
      success: true,
      data: {
        userMessage,
        aiResponse: aiMessage
      }
    });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, beforeMessageId } = req.query;
    const userId = req.user.id;

    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    let sessionMessages = Array.from(messages.values())
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply cursor-based pagination
    if (beforeMessageId) {
      const beforeIndex = sessionMessages.findIndex(msg => msg.id === beforeMessageId);
      if (beforeIndex > 0) {
        sessionMessages = sessionMessages.slice(beforeIndex);
      }
    }

    sessionMessages = sessionMessages.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        messages: sessionMessages.reverse(), // Return in chronological order
        hasMore: sessionMessages.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
};

const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Delete session and all associated messages
    sessions.delete(sessionId);
    
    Array.from(messages.keys()).forEach(messageId => {
      const message = messages.get(messageId);
      if (message && message.sessionId === sessionId) {
        messages.delete(messageId);
      }
    });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    logger.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session'
    });
  }
};

const getAvailableAgents = async (req, res) => {
  try {
    res.json({
      success: true,
      data: availableAgents
    });
  } catch (error) {
    logger.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available agents'
    });
  }
};

const getAvailableModels = async (req, res) => {
  try {
    res.json({
      success: true,
      data: availableModels
    });
  } catch (error) {
    logger.error('Get models error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available models'
    });
  }
};

const executeCode = async (req, res) => {
  try {
    const { projectId, language, code, input, timeoutMs = 30000 } = req.body;
    const userId = req.user.id;

    const execution = {
      id: uuidv4(),
      userId,
      projectId,
      language,
      code,
      input,
      status: 'queued',
      createdAt: new Date().toISOString()
    };

    executions.set(execution.id, execution);

    // Simulate code execution (replace with actual sandboxed execution)
    setTimeout(() => {
      simulateCodeExecution(execution.id);
    }, 1000);

    res.status(201).json({
      success: true,
      data: {
        executionId: execution.id,
        status: execution.status
      }
    });
  } catch (error) {
    logger.error('Execute code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute code'
    });
  }
};

const getExecutionResult = async (req, res) => {
  try {
    const { executionId } = req.params;
    const userId = req.user.id;

    const execution = executions.get(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }

    if (execution.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    logger.error('Get execution result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get execution result'
    });
  }
};

// Helper functions

const simulateAIResponse = async (message, agentId) => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

  const responses = {
    architectrix: [
      "Based on your requirements, I recommend implementing a clean architecture pattern with MVVM for the presentation layer.",
      "For scalability, consider using a microservices architecture with event-driven communication between services.",
      "The system should follow SOLID principles and implement proper dependency injection for testability."
    ],
    code_conjurer: [
      "Here's a Kotlin implementation that follows best practices:\n\n```kotlin\nclass UserRepository @Inject constructor() {\n    // Implementation\n}\n```",
      "I've generated the code structure you requested. Let me also add proper error handling and validation.",
      "The implementation includes unit tests and follows the established coding conventions."
    ],
    ui_designer: [
      "I suggest using Material Design 3 components for a modern and accessible user interface.",
      "The user flow should prioritize simplicity and reduce cognitive load for better user experience.",
      "Consider implementing dark mode support and responsive design for various screen sizes."
    ]
  };

  const agentResponses = responses[agentId] || responses.code_conjurer;
  return agentResponses[Math.floor(Math.random() * agentResponses.length)];
};

const simulateCodeExecution = (executionId) => {
  const execution = executions.get(executionId);
  if (!execution) return;

  execution.status = 'running';
  execution.startedAt = new Date().toISOString();
  executions.set(executionId, execution);

  // Simulate execution time
  setTimeout(() => {
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.executionTime = Math.floor(Math.random() * 2000) + 100;
    execution.result = {
      output: "Hello, World!\nExecution completed successfully.",
      exitCode: 0,
      memoryUsed: Math.floor(Math.random() * 50) + 10,
      cpuTime: execution.executionTime
    };
    executions.set(executionId, execution);
  }, 2000 + Math.random() * 3000);
};

module.exports = {
  createSession,
  getSession,
  sendMessage,
  getMessages,
  deleteSession,
  getAvailableAgents,
  getAvailableModels,
  executeCode,
  getExecutionResult
};