import { WorkspaceRepository } from '../../models/repositories/WorkspaceRepository';
import { UserRepository } from '../../models/repositories/UserRepository';
import { TeamRepository } from '../../models/repositories/TeamRepository';
import { UserWorkspaceService } from './UserWorkspaceService';
import { NotificationService } from '../notification/NotificationService';
import { Logger } from '../../utils/logger';
import { WorkspaceError, ErrorCodes } from '../../utils/errors';
import { IUser, IWorkspace, WorkspaceSettings } from '../../types/workspace.types';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';

export interface CreateWorkspaceDto {
  name: string;
  domain: string;
  description?: string;
  logo?: string;
  settings?: Partial<WorkspaceSettings>;
  ownerId: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  logo?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface WorkspaceWithMembers extends IWorkspace {
  memberCount: number;
  teamCount: number;
  owner: IUser;
}

export class WorkspaceService {
  private workspaceRepository: WorkspaceRepository;
  private userRepository: UserRepository;
  private teamRepository: TeamRepository;
  private userWorkspaceService: UserWorkspaceService;
  private notificationService: NotificationService;
  private logger: Logger;

  constructor(
    workspaceRepository: WorkspaceRepository,
    userRepository: UserRepository,
    teamRepository: TeamRepository,
    userWorkspaceService: UserWorkspaceService,
    notificationService: NotificationService,
    logger: Logger
  ) {
    this.workspaceRepository = workspaceRepository;
    this.userRepository = userRepository;
    this.teamRepository = teamRepository;
    this.userWorkspaceService = userWorkspaceService;
    this.notificationService = notificationService;
    this.logger = logger;
  }

  /**
   * Create a new workspace with proper validation and owner assignment
   */
  async createWorkspace(workspaceData: CreateWorkspaceDto): Promise<IWorkspace> {
    try {
      // Validate domain uniqueness
      const existingWorkspace = await this.workspaceRepository.findByDomain(workspaceData.domain);
      if (existingWorkspace) {
        throw new WorkspaceError('Domain already exists', ErrorCodes.DOMAIN_EXISTS);
      }

      // Validate owner exists
      const owner = await this.userRepository.findById(workspaceData.ownerId);
      if (!owner) {
        throw new WorkspaceError('Owner not found', ErrorCodes.USER_NOT_FOUND);
      }

      // Create workspace
      const workspace = await this.workspaceRepository.create({
        name: workspaceData.name,
        domain: workspaceData.domain,
        description: workspaceData.description,
        logo: workspaceData.logo,
        is_active: true,
        settings: {
          allow_external_invites: false,
          default_permissions: 'READ' as any,
          timeZone: 'UTC',
          working_hours: {
            start: '09:00',
            end: '17:00',
            working_days: [1, 2, 3, 4, 5]
          },
          ...workspaceData.settings
        }
      });

      // Assign owner to workspace
      await this.userWorkspaceService.addUserToWorkspace({
        userId: workspaceData.ownerId,
        workspace_id: workspace.id,
        role: 'OWNER' as any,
        permissions: 'FULL' as any
      });

      this.logger.info(`Workspace created: ${workspace.id} by user ${workspaceData.ownerId}`);

      // Send notification
      await this.notificationService.sendWorkspaceCreatedNotification(workspace, owner);

      return workspace;
    } catch (error) {
      this.logger.error('Error creating workspace:', error);
      throw error;
    }
  }

  /**
   * Get workspace by ID with user validation
   */
  async getWorkspaceById(workspace_id: string, userId: string): Promise<IWorkspace> {
    try {
      const workspace = await this.workspaceRepository.findById(workspace_id);
      if (!workspace) {
        throw new WorkspaceError('Workspace not found', ErrorCodes.WORKSPACE_NOT_FOUND);
      }

      // Validate user has access to workspace
      const userWorkspace = await this.userWorkspaceService.getUserWorkspace(userId, workspace_id);
      if (!userWorkspace) {
        throw new WorkspaceError('Access denied', ErrorCodes.ACCESS_DENIED);
      }

      return workspace;
    } catch (error) {
      this.logger.error(`Error getting workspace ${workspace_id}:`, error);
      throw error;
    }
  }

  /**
   * Get workspace by domain with user validation
   */
  async getWorkspaceByDomain(domain: string, userId: string): Promise<IWorkspace> {
    try {
      const workspace = await this.workspaceRepository.findByDomain(domain);
      if (!workspace) {
        throw new WorkspaceError('Workspace not found', ErrorCodes.WORKSPACE_NOT_FOUND);
      }

      // Validate user has access to workspace
      const userWorkspace = await this.userWorkspaceService.getUserWorkspace(userId, workspace.id);
      if (!userWorkspace) {
        throw new WorkspaceError('Access denied', ErrorCodes.ACCESS_DENIED);
      }

      return workspace;
    } catch (error) {
      this.logger.error(`Error getting workspace by domain ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Update workspace with proper permission validation
   */

  async updateWorkspace(workspace_id: string, updates: Partial<IWorkspace>): Promise<IWorkspace> {
    const workspace = await this.workspaceRepository.findById(workspace_id);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const sanitizedUpdates: Partial<IWorkspace> = {
      ...updates,
      settings: updates.settings !== undefined ? {
        allow_external_invites: updates.settings.allow_external_invites ?? false,
        default_permissions: updates.settings.default_permissions ?? 'READ',
        timeZone: updates.settings.timeZone ?? 'UTC',
        working_hours: updates.settings.working_hours ?? {
          start: '09:00',
          end: '17:00',
          working_days: [1, 2, 3, 4, 5]
        }
      } : undefined
    } as IWorkspace;

    const updatedWorkspace = await this.workspaceRepository.update(workspace_id, sanitizedUpdates);

    if (!updatedWorkspace) {
      throw new InternalServerErrorException('Failed to update workspace');
    }

    return updatedWorkspace;
  }

  /**
   * Get user's workspaces
   */
  async getUserWorkspaces(userId: string): Promise<IWorkspace[]> {
    try {
      const workspaces = await this.workspaceRepository.findUserWorkspaces(userId);
      return workspaces;
    } catch (error) {
      this.logger.error(`Error getting user workspaces for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get workspace with detailed information
   */
  async getWorkspaceDetails(workspace_id: string, userId: string): Promise<WorkspaceWithMembers> {
    try {
      const workspace = await this.getWorkspaceById(workspace_id, userId);
      
      // Get member count
      const members = await this.userRepository.findWorkspaceUsers(workspace_id);
      const memberCount = members.length;

      // Get team count
      const teams = await this.teamRepository.findByWorkspace(workspace_id);
      const teamCount = teams.length;

      // Get owner information
      const ownerWorkspace = await this.userWorkspaceService.getWorkspaceOwner(workspace_id);
      const owner = await this.userRepository.findById(ownerWorkspace.user_id);

      if (!owner) {
        throw new WorkspaceError('Workspace owner not found', ErrorCodes.USER_NOT_FOUND);
      }

      return {
        ...workspace,
        memberCount,
        teamCount,
        owner
      };
    } catch (error) {
      this.logger.error(`Error getting workspace details ${workspace_id}:`, error);
      throw error;
    }
  }

  /**
   * Delete workspace (soft delete)
   */
  async deleteWorkspace(workspace_id: string, userId: string): Promise<boolean> {
    try {
      // Validate user is owner
      const userWorkspace = await this.userWorkspaceService.getUserWorkspace(userId, workspace_id);
      if (!userWorkspace || userWorkspace.role !== 'OWNER') {
        throw new WorkspaceError('Only workspace owner can delete workspace', ErrorCodes.INSUFFICIENT_PERMISSIONS);
      }

      const success = await this.workspaceRepository.delete(workspace_id);
      
      if (success) {
        this.logger.info(`Workspace deleted: ${workspace_id} by user ${userId}`);
        
        // Notify all workspace members
        const members = await this.userRepository.findWorkspaceUsers(workspace_id);
        await this.notificationService.sendWorkspaceDeletedNotification(workspace_id, members);
      }

      return success;
    } catch (error) {
      this.logger.error(`Error deleting workspace ${workspace_id}:`, error);
      throw error;
    }
  }

  /**
   * Validate user access to workspace
   */
  async validateWorkspaceAccess(userId: string, workspace_id: string): Promise<boolean> {
    try {
      const userWorkspace = await this.userWorkspaceService.getUserWorkspace(userId, workspace_id);
      return userWorkspace !== null && userWorkspace.is_active;
    } catch (error) {
      this.logger.error(`Error validating workspace access:`, error);
      return false;
    }
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspace_id: string, userId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    totalTeams: number;
    totalDepartments: number;
    recentActivity: number;
  }> {
    try {
      // Validate access
      await this.getWorkspaceById(workspace_id, userId);

      const members = await this.userRepository.findWorkspaceUsers(workspace_id);
      const teams = await this.teamRepository.findByWorkspace(workspace_id);

      // Get recent activity (last 7 days)
      const recentActivity = await this.getRecentActivityCount(workspace_id);

      // Count departments (unique team names or tag-based grouping)
      const departmentSet = new Set<string>();
      for (const team of teams) {
        if (team.department_id) {
          departmentSet.add(team.department_id);
        }
      }

      return {
        totalMembers: members.length,
        activeMembers: members.filter(m => m.is_active).length,
        totalTeams: teams.length,
        totalDepartments: departmentSet.size,
        recentActivity
      };
    } catch (error) {
      this.logger.error(`Error getting workspace stats ${workspace_id}:`, error);
      throw error;
    }
  }

  private async getRecentActivityCount(workspace_id: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as activity_count FROM teams
        WHERE workspace_id = $1 AND updated_at >= NOW() - INTERVAL '7 days'
      `;
      const result = await this.teamRepository['pool'].query(query, [workspace_id]);
      return parseInt(result.rows[0]?.activity_count || '0', 10);
    } catch (error) {
      this.logger.error(`Failed to fetch recent activity count for workspace ${workspace_id}`, error);
      return 0;
    }
  }
}
