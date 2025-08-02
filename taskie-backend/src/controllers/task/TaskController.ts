// src/controllers/task/TaskController.ts
import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../../services/task/TaskService';
import type { AuthenticatedRequest } from '../../types/auth.types';
import { Logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/apiResponse';
import { ValidationError } from '../../utils/errors';
import { body, param, query, validationResult } from 'express-validator';

export class TaskController {
  private taskService: TaskService;
  private logger: Logger;

  constructor(taskService: TaskService, logger: Logger) {
    this.taskService = taskService;
    this.logger = logger;
  }

  /**
   * Create a new task
   */
  createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const taskData = req.body;
      const userId = req.user!.id;

      const task = await this.taskService.createTask(taskData, userId);

      res.status(201).json(ApiResponse.success(task, 'Task created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a task
   */
  updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { id, type } = req.params;
      const updates = req.body;

      const task = await this.taskService.updateTask(id, type, updates);

      if (!task) {
        res.status(404).json(ApiResponse.error('Task not found', 404));
        return;
      }

      res.json(ApiResponse.success(task, 'Task updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a task
   */
  deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { id, type } = req.params;

      const success = await this.taskService.deleteTask(id, type);

      if (!success) {
        res.status(404).json(ApiResponse.error('Task not found', 404));
        return;
      }

      res.json(ApiResponse.success(null, 'Task deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get task by ID
   */
  getTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { id, type } = req.params;

      const task = await this.taskService.getTaskById(id, type);

      if (!task) {
        res.status(404).json(ApiResponse.error('Task not found', 404));
        return;
      }

      res.json(ApiResponse.success(task, 'Task retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tasks by workspace
   */
  getWorkspaceTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { workspace_id } = req.params;

      const tasks = await this.taskService.getTasksByWorkspace(workspace_id);

      res.json(ApiResponse.success(tasks, 'Workspace tasks retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tasks by assignee
   */
  getAssigneeTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { assignee_id } = req.params;

      const tasks = await this.taskService.getTasksByAssignee(assignee_id);

      res.json(ApiResponse.success(tasks, 'Assignee tasks retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tasks by creator
   */
  getCreatorTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { creator_id } = req.params;

      const tasks = await this.taskService.getTasksByCreator(creator_id);

      res.json(ApiResponse.success(tasks, 'Creator tasks retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tasks with hierarchy
   */
  getTasksWithHierarchy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { workspace_id } = req.params;

      const tasks = await this.taskService.getTasksWithHierarchy(workspace_id);

      res.json(ApiResponse.success(tasks, 'Tasks with hierarchy retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tasks by status
   */
  getTasksByStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { workspace_id } = req.params;
      const { status } = req.query;

      const tasks = await this.taskService.getTasksByStatus(workspace_id, status as string);

      res.json(ApiResponse.success(tasks, 'Tasks by status retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get task statistics
   */
  getTaskStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { workspace_id } = req.params;

      const stats = await this.taskService.getTaskStats(workspace_id);

      res.json(ApiResponse.success(stats, 'Task statistics retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validation rules
   */
  static validateCreateTask = [
    body('name')
      .isLength({ min: 1, max: 200 })
      .withMessage('Task name must be between 1 and 200 characters'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description must not exceed 2000 characters'),
    body('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    body('department_id')
      .optional()
      .isUUID()
      .withMessage('Invalid department ID'),
    body('team_id')
      .optional()
      .isUUID()
      .withMessage('Invalid team ID'),
    body('assignee_id')
      .optional()
      .isUUID()
      .withMessage('Invalid assignee ID'),
    body('priority')
      .isIn(['HIGH', 'MEDIUM', 'LOW'])
      .withMessage('Priority must be HIGH, MEDIUM, or LOW'),
    body('status')
      .optional()
      .isIn(['CREATED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'])
      .withMessage('Status must be CREATED, IN_PROGRESS, REVIEW, or COMPLETED'),
    body('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    body('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date'),
    body('estimated_hours')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Estimated hours must be a positive number'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('type')
      .isIn(['INITIATIVE', 'EPIC', 'STORY', 'TASK'])
      .withMessage('Type must be INITIATIVE, EPIC, STORY, or TASK'),
    body('initiative_id')
      .optional()
      .isUUID()
      .withMessage('Invalid initiative ID'),
    body('epic_id')
      .optional()
      .isUUID()
      .withMessage('Invalid epic ID'),
    body('story_id')
      .optional()
      .isUUID()
      .withMessage('Invalid story ID')
  ];

  static validateUpdateTask = [
    param('id')
      .isUUID()
      .withMessage('Invalid task ID'),
    param('type')
      .isIn(['INITIATIVE', 'EPIC', 'STORY', 'TASK'])
      .withMessage('Type must be INITIATIVE, EPIC, STORY, or TASK'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Task name must be between 1 and 200 characters'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description must not exceed 2000 characters'),
    body('department_id')
      .optional()
      .isUUID()
      .withMessage('Invalid department ID'),
    body('team_id')
      .optional()
      .isUUID()
      .withMessage('Invalid team ID'),
    body('assignee_id')
      .optional()
      .isUUID()
      .withMessage('Invalid assignee ID'),
    body('priority')
      .optional()
      .isIn(['HIGH', 'MEDIUM', 'LOW'])
      .withMessage('Priority must be HIGH, MEDIUM, or LOW'),
    body('status')
      .optional()
      .isIn(['CREATED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'])
      .withMessage('Status must be CREATED, IN_PROGRESS, REVIEW, or COMPLETED'),
    body('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    body('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date'),
    body('estimated_hours')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Estimated hours must be a positive number'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
  ];

  static validateTaskId = [
    param('id')
      .isUUID()
      .withMessage('Invalid task ID'),
    param('type')
      .isIn(['INITIATIVE', 'EPIC', 'STORY', 'TASK'])
      .withMessage('Type must be INITIATIVE, EPIC, STORY, or TASK')
  ];

  static validateworkspace_id = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID')
  ];

  static validateUserId = [
    param('assignee_id')
      .isUUID()
      .withMessage('Invalid assignee ID')
  ];

  static validatecreator_id = [
    param('creator_id')
      .isUUID()
      .withMessage('Invalid creator ID')
  ];

  static validateStatus = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    query('status')
      .isIn(['CREATED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'])
      .withMessage('Status must be CREATED, IN_PROGRESS, REVIEW, or COMPLETED')
  ];
}