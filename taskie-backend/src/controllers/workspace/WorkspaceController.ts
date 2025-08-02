import { Request, Response, NextFunction } from 'express';
import { WorkspaceService, CreateWorkspaceDto, UpdateWorkspaceDto } from '../../services/workspace/WorkspaceService';
import { UserWorkspaceService, AddUserToWorkspaceDto, UpdateUserWorkspaceDto } from '../../services/workspace/UserWorkspaceService';
import { AuthenticatedRequest } from '../../types/auth.types';
import { Logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/apiResponse';
import { ValidationError } from '../../utils/errors';
import { body, param, query, validationResult } from 'express-validator';
import { IWorkspace } from '../../types/workspace.types';
import { NotFoundError, AuthorizationError } from '../../utils/errors';

export class WorkspaceController {
  private workspaceService: WorkspaceService;
  private userWorkspaceService: UserWorkspaceService;
  private logger: Logger;

  constructor(
    workspaceService: WorkspaceService,
    userWorkspaceService: UserWorkspaceService,
    logger: Logger
  ) {
    this.workspaceService = workspaceService;
    this.userWorkspaceService = userWorkspaceService;
    this.logger = logger;
  }

  /**
   * Create new workspace
   */
  createWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { name, domain, description, logo, settings } = req.body;
      const userId = req.user!.id;
      const workspaceData: CreateWorkspaceDto = {
        name,
        domain: domain.toLowerCase(),
        description,
        logo,
        settings,
        ownerId: userId
      };
      const workspace = await this.workspaceService.createWorkspace(workspaceData);
      this.logger.info(`Workspace created: ${workspace.id} by user ${userId}`);
      res.status(201).json(
        ApiResponse.success(workspace, 'Workspace created successfully')
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get workspace by ID
   */
  getWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id } = req.params;
      const userId = req.user!.id;
      const workspace = await this.workspaceService.getWorkspaceById(workspace_id, userId);
      res.json(ApiResponse.success(workspace, 'Workspace retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get workspace by domain
   */
  getWorkspaceByDomain = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { domain } = req.params;
      const userId = req.user!.id;
      const workspace = await this.workspaceService.getWorkspaceByDomain(domain, userId);
      res.json(ApiResponse.success(workspace, 'Workspace retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update workspace
   */
  updateWorkspace = async (
    req: AuthenticatedRequest<{ workspace_id: string }, any, UpdateWorkspaceDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id } = req.params;
      const userId = req.user.id;
      // Get existing workspace to merge with full settings
      const existingWorkspace = await this.workspaceService.getWorkspaceById(workspace_id, userId);
      if (!existingWorkspace) throw new NotFoundError('Workspace not found');
      const updateData: Partial<IWorkspace> = {
        ...req.body,
        settings: req.body.settings
          ? {
              ...existingWorkspace.settings,
              ...req.body.settings
            }
          : undefined
      };
      const workspace = await this.workspaceService.updateWorkspace(workspace_id, updateData);
      res.json(ApiResponse.success(workspace, 'Workspace updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete workspace
   */
  deleteWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id } = req.params;
      const userId = req.user!.id;
      const success = await this.workspaceService.deleteWorkspace(workspace_id, userId);
      if (success) {
        res.json(ApiResponse.success(null, 'Workspace deleted successfully'));
      } else {
        res.status(404).json(ApiResponse.error('Workspace not found', 404));
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's workspaces
   */
  getUserWorkspaces = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const workspaces = await this.workspaceService.getUserWorkspaces(userId);
      res.json(ApiResponse.success(workspaces, 'User workspaces retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get workspace details with statistics
   */
  getWorkspaceDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id } = req.params;
      const userId = req.user!.id;
      const workspaceDetails = await this.workspaceService.getWorkspaceDetails(workspace_id, userId);
      res.json(ApiResponse.success(workspaceDetails, 'Workspace details retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get workspace statistics
   */
  getWorkspaceStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id } = req.params;
      const userId = req.user!.id;
      const stats = await this.workspaceService.getWorkspaceStats(workspace_id, userId);
      res.json(ApiResponse.success(stats, 'Workspace statistics retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add user to workspace
   */
  addUserToWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id } = req.params;
      const { userId: targetUserId, role, permissions, team_id } = req.body;
      const currentUserId = req.user!.id;
      // Validate current user has permission to add users
      const hasPermission = await this.userWorkspaceService.hasPermission(
        currentUserId, 
        workspace_id, 
        'WRITE' as any
      );
      if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to add users to this workspace');
      }
      const addUserData: AddUserToWorkspaceDto = {
        userId: targetUserId,
        workspace_id,
        role,
        permissions,
        team_id
      };
      const userWorkspace = await this.userWorkspaceService.addUserToWorkspace(addUserData);
      res.status(201).json(
        ApiResponse.success(userWorkspace, 'User added to workspace successfully')
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user's role in workspace
   */
  updateUserWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id, userId: targetUserId } = req.params;
      const { role, permissions, team_id } = req.body;
      const currentUserId = req.user!.id;
      const updateData: UpdateUserWorkspaceDto = {
        role,
        permissions,
        team_id
      };
      const userWorkspace = await this.userWorkspaceService.updateUserWorkspace(
        targetUserId,
        workspace_id,
        updateData,
        currentUserId
      );
      res.json(ApiResponse.success(userWorkspace, 'User workspace updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove user from workspace
   */
  removeUserFromWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id, userId: targetUserId } = req.params;
      const currentUserId = req.user!.id;
      const success = await this.userWorkspaceService.removeUserFromWorkspace(
        targetUserId,
        workspace_id,
        currentUserId
      );
      if (success) {
        res.json(ApiResponse.success(null, 'User removed from workspace successfully'));
      } else {
        res.status(404).json(ApiResponse.error('User workspace relationship not found', 404));
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get workspace members
   */
  getWorkspaceMembers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id } = req.params;
      const { page = 1, limit = 50, role, team_id } = req.query;
      const userId = req.user!.id;
      // Validate user has access to workspace
      const hasAccess = await this.workspaceService.validateWorkspaceAccess(userId, workspace_id);
      if (!hasAccess) {
        throw new AuthorizationError('You do not have permission to access this workspace');
      }
      const members = await this.userWorkspaceService.getWorkspaceMembers(workspace_id);
      // Filter members based on query parameters
      let filteredMembers = members;
      
      if (role) {
        filteredMembers = filteredMembers.filter(member => member.role === role);
      }
      
      if (team_id) {
        filteredMembers = filteredMembers.filter(member => member.team_id === team_id);
      }
      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      
      const paginatedMembers = filteredMembers.slice(startIndex, endIndex);
      
      const response = {
        members: paginatedMembers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredMembers.length,
          totalPages: Math.ceil(filteredMembers.length / limitNum)
        }
      };
      res.json(ApiResponse.success(response, 'Workspace members retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Assign user to team
   */
  assignUserToTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id, userId: targetUserId } = req.params;
      const { team_id } = req.body;
      const currentUserId = req.user!.id;
      const userWorkspace = await this.userWorkspaceService.assignUserToTeam(
        targetUserId,
        workspace_id,
        team_id,
        currentUserId
      );
      res.json(ApiResponse.success(userWorkspace, 'User assigned to team successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove user from team
   */
  removeUserFromTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }
      const { workspace_id, userId: targetUserId } = req.params;
      const currentUserId = req.user!.id;
      const userWorkspace = await this.userWorkspaceService.removeUserFromTeam(
        targetUserId,
        workspace_id,
        currentUserId
      );
      res.json(ApiResponse.success(userWorkspace, 'User removed from team successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validation rules for workspace operations
   */
  static validateCreateWorkspace = [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Workspace name must be between 1 and 100 characters'),
    body('domain')
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Domain must be 3-50 characters and contain only lowercase letters, numbers, and hyphens'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('logo')
      .optional()
      .isURL()
      .withMessage('Logo must be a valid URL'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object')
  ];

  static validateUpdateWorkspace = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Workspace name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('logo')
      .optional()
      .isURL()
      .withMessage('Logo must be a valid URL'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object')
  ];

  static validateworkspace_id = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID')
  ];

  static validateDomain = [
    param('domain')
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Invalid domain format')
  ];

  static validateAddUser = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    body('userId')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('role')
      .isIn(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'])
      .withMessage('Invalid role'),
    body('permissions')
      .isIn(['FULL', 'WRITE', 'READ', 'NONE'])
      .withMessage('Invalid permissions'),
    body('team_id')
      .optional()
      .isUUID()
      .withMessage('Invalid team ID')
  ];

  static validateUpdateUser = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('role')
      .optional()
      .isIn(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'])
      .withMessage('Invalid role'),
    body('permissions')
      .optional()
      .isIn(['FULL', 'WRITE', 'READ', 'NONE'])
      .withMessage('Invalid permissions'),
    body('team_id')
      .optional()
      .isUUID()
      .withMessage('Invalid team ID')
  ];

  static validateUserInWorkspace = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID')
  ];

  static validateGetMembers = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('role')
      .optional()
      .isIn(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'])
      .withMessage('Invalid role filter'),
    query('team_id')
      .optional()
      .isUUID()
      .withMessage('Invalid team ID filter')
  ];

  static validateAssignToTeam = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('team_id')
      .isUUID()
      .withMessage('Invalid team ID')
  ];
}