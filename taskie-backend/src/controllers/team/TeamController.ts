import { Request, Response, NextFunction } from 'express';
import { TeamService, CreateTeamDto, UpdateTeamDto } from '../../services/team/TeamService';
import { AuthenticatedRequest } from '../../types/auth.types';
import { Logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/apiResponse';
import { ValidationError } from '../../utils/errors';
import { body, param, query, validationResult } from 'express-validator';

export class TeamController {
  private teamService: TeamService;
  private logger: Logger;

  constructor(teamService: TeamService, logger: Logger) {
    this.teamService = teamService;
    this.logger = logger;
  }

  /**
   * Create new team
   */
  createTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { workspace_id, department_id, name, description, lead_id } = req.body;
      const userId = req.user!.id;

      const teamData: CreateTeamDto = {
        workspace_id,
        department_id,
        name,
        description,
        lead_id
      };

      const team = await this.teamService.createTeam(teamData, userId);

      res.status(201).json(ApiResponse.success(team, 'Team created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get team by ID
   */
  getTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { team_id } = req.params;
      const userId = req.user!.id;

      const team = await this.teamService.getTeamById(team_id, userId);

      res.json(ApiResponse.success(team, 'Team retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update team
   */
  updateTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { team_id } = req.params;
      const { name, description, lead_id } = req.body;
      const userId = req.user!.id;

      const updateData: UpdateTeamDto = {
        name,
        description,
        lead_id
      };

      const team = await this.teamService.updateTeam(team_id, updateData, userId);

      res.json(ApiResponse.success(team, 'Team updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete team
   */
  deleteTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { team_id } = req.params;
      const userId = req.user!.id;

      const success = await this.teamService.deleteTeam(team_id, userId);

      if (success) {
        res.json(ApiResponse.success(null, 'Team deleted successfully'));
      } else {
        res.status(404).json(ApiResponse.error('Team not found', 404));
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get workspace teams
   */
  getWorkspaceTeams = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { workspace_id } = req.params;
      const { department_id } = req.query;
      const userId = req.user!.id;

      const teams = department_id 
        ? await this.teamService.getDepartmentTeams(department_id as string, userId)
        : await this.teamService.getWorkspaceTeams(workspace_id, userId);

      res.json(ApiResponse.success(teams, 'Teams retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get team members
   */
  getTeamMembers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { team_id } = req.params;
      const userId = req.user!.id;

      const members = await this.teamService.getTeamMembers(team_id, userId);

      res.json(ApiResponse.success(members, 'Team members retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validation rules
   */
  static validateCreateTeam = [
    body('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    body('department_id')
      .isUUID()
      .withMessage('Invalid department ID'),
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Team name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('lead_id')
      .optional()
      .isUUID()
      .withMessage('Invalid lead ID')
  ];

  static validateUpdateTeam = [
    param('team_id')
      .isUUID()
      .withMessage('Invalid team ID'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Team name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('lead_id')
      .optional()
      .isUUID()
      .withMessage('Invalid lead ID')
  ];

  static validateteam_id = [
    param('team_id')
      .isUUID()
      .withMessage('Invalid team ID')
  ];

  static validateWorkspaceTeams = [
    param('workspace_id')
      .isUUID()
      .withMessage('Invalid workspace ID'),
    query('department_id')
      .optional()
      .isUUID()
      .withMessage('Invalid department ID')
  ];
}