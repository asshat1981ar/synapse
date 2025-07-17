const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');

const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    displayName: user.displayName
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });

  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  try {
    logger.info('Registration attempt:', { email: req.body.email, displayName: req.body.displayName });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.info('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, displayName } = req.body;
    logger.info('Registration data validated:', { email, displayName });

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      displayName
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Create refresh token in database
    await user.createRefreshToken();

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Create refresh token in database
    await user.createRefreshToken();

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Verify and decode the refresh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate refresh token in database
    const isValidToken = await user.validateRefreshToken(token);
    if (!isValidToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    
    // Revoke old refresh token and create new one
    await user.revokeRefreshToken(token);
    await user.createRefreshToken();

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (token) {
      // Decode token to get user ID
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          await user.revokeRefreshToken(token);
        }
      } catch (error) {
        // Token might be invalid, but that's okay for logout
        logger.warn('Invalid token during logout:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user stats
    const stats = await user.getStats();

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        stats
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const { displayName, preferences } = req.body;
    const updates = {};

    if (displayName) updates.display_name = displayName;
    if (preferences) updates.preferences = preferences;

    await user.update(updates);

    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile
};