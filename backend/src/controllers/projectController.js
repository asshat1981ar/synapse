const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const Project = require('../models/Project');

const getProjects = async (req, res) => {
  try {
    const { limit = 20, offset = 0, filter } = req.query;
    const userId = req.user.id;

    const projects = await Project.findByOwnerId(
      userId, 
      parseInt(limit), 
      parseInt(offset), 
      filter
    );

    // Get total count for pagination
    const countQuery = filter 
      ? { ownerId: userId, filter }
      : { ownerId: userId };
    
    // For now, we'll use the returned count. In a real app, you'd run a separate count query
    const total = projects.length; // This is simplified - should be actual total count

    res.json({
      success: true,
      data: {
        data: projects.map(p => p.toJSON()),
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: projects.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get projects'
    });
  }
};

const createProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, projectType, description, templateId } = req.body;
    const userId = req.user.id;

    // Get default configuration based on project type
    const configuration = getDefaultConfiguration(projectType);

    const project = await Project.create({
      name,
      description,
      projectType,
      ownerId: userId,
      configuration
    });

    logger.info(`Project created: ${project.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: project.toJSON()
    });
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
};

const getProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check access permissions
    const hasAccess = await project.hasAccess(userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get project files and collaborators
    const [files, collaborators] = await Promise.all([
      project.getFiles(),
      project.getCollaborators()
    ]);

    res.json({
      success: true,
      data: {
        ...project.toJSON(),
        files,
        collaborators
      }
    });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project'
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { projectId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check permissions (only owner can update)
    if (project.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only project owner can update project'
      });
    }

    await project.update(updates);

    logger.info(`Project updated: ${projectId} by user ${userId}`);

    res.json({
      success: true,
      data: project.toJSON()
    });
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check permissions (only owner can delete)
    if (project.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only project owner can delete project'
      });
    }

    await project.delete();

    logger.info(`Project deleted: ${projectId} by user ${userId}`);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
};

const getProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check access permissions
    const hasAccess = await project.hasAccess(userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const files = await project.getFiles();

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    logger.error('Get project files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project files'
    });
  }
};

const createFile = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filePath, content = '', language } = req.body;
    const userId = req.user.id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check permissions
    const hasAccess = await project.hasAccess(userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const file = await project.createFile({
      filePath,
      content,
      language,
      modifiedBy: userId
    });

    res.status(201).json({
      success: true,
      data: file
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        error: 'File already exists at this path'
      });
    }

    logger.error('Create file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create file'
    });
  }
};

const updateFile = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const { content, language } = req.body;
    const userId = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check permissions
    const hasAccess = await project.hasAccess(userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update file
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (content !== undefined) {
      updateFields.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }

    if (language !== undefined) {
      updateFields.push(`language = $${paramCount}`);
      values.push(language);
      paramCount++;
    }

    updateFields.push(`modified_at = CURRENT_TIMESTAMP`);
    updateFields.push(`modified_by = $${paramCount}`);
    values.push(userId);
    paramCount++;

    values.push(fileId, projectId);

    const query = `
      UPDATE project_files 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND project_id = $${paramCount + 1}
      RETURNING *
    `;

    const database = require('../config/database');
    const result = await database.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Update file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update file'
    });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const userId = req.user.id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check permissions
    const hasAccess = await project.hasAccess(userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const database = require('../config/database');
    const result = await database.query(
      'DELETE FROM project_files WHERE id = $1 AND project_id = $2',
      [fileId, projectId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
};

// Helper function to get default configuration based on project type
const getDefaultConfiguration = (projectType) => {
  const configurations = {
    android_app: {
      targetSdk: 34,
      minSdk: 24,
      language: 'kotlin',
      uiFramework: 'jetpack_compose',
      aiAgents: ['architectrix', 'code_conjurer']
    },
    web_app: {
      framework: 'react',
      language: 'typescript',
      styling: 'tailwind',
      aiAgents: ['web_architect', 'frontend_developer']
    },
    api: {
      framework: 'express',
      language: 'javascript',
      database: 'postgresql',
      aiAgents: ['api_architect', 'backend_developer']
    },
    script: {
      language: 'python',
      runtime: 'python3',
      aiAgents: ['script_writer']
    },
    document: {
      format: 'markdown',
      aiAgents: ['technical_writer']
    }
  };

  return configurations[projectType] || {};
};

module.exports = {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectFiles,
  createFile,
  updateFile,
  deleteFile
};