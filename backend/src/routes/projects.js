const express = require('express');
const { body, param, query } = require('express-validator');
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation rules
const createProjectValidation = [
  body('name').trim().isLength({ min: 1 }).withMessage('Project name is required'),
  body('projectType').isIn(['android_app', 'web_app', 'api', 'script', 'document']).withMessage('Invalid project type'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long')
];

const updateProjectValidation = [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Project name cannot be empty'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long')
];

const projectIdValidation = [
  param('projectId').isUUID().withMessage('Invalid project ID')
];

// Routes
router.get('/', projectController.getProjects);
router.post('/', createProjectValidation, projectController.createProject);
router.get('/:projectId', projectIdValidation, projectController.getProject);
router.put('/:projectId', [...projectIdValidation, ...updateProjectValidation], projectController.updateProject);
router.delete('/:projectId', projectIdValidation, projectController.deleteProject);

// File management routes
router.get('/:projectId/files', projectIdValidation, projectController.getProjectFiles);
router.post('/:projectId/files', projectIdValidation, projectController.createFile);
router.put('/:projectId/files/:fileId', projectController.updateFile);
router.delete('/:projectId/files/:fileId', projectController.deleteFile);

module.exports = router;