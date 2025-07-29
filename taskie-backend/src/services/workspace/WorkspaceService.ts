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
        isActive: true,
        settings: {
          allowExternalInvites: false,
          defaultPermissions: 'READ' as any,
          timeZone: 'UTC',
          workingHours: {
            start: '09:00',
            end: '17:00',
            workingDays: [1, 2, 3, 4, 5]
          },
          ...workspaceData.settings
        }
      });

      // Assign owner to workspace
      await this.userWorkspaceService.addUserToWorkspace({
        userId: workspaceData.ownerId,
        workspaceId: workspace.id,
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
  async getWorkspaceById(workspaceId: string, userId: string): Promise<IWorkspace> {
    try {
      const workspace = await this.workspaceRepository.findById(workspaceId);
      if (!workspace) {
        throw new WorkspaceError('Workspace not found', ErrorCodes.WORKSPACE_NOT_FOUND);
      }

      // Validate user has access to workspace
      const userWorkspace = await this.userWorkspaceService.getUserWorkspace(userId, workspaceId);
      if (!userWorkspace) {
        throw new WorkspaceError('Access denied', ErrorCodes.ACCESS_DENIED);
      }

      return workspace;
    } catch (error) {
      this.logger.error(`Error getting workspace ${workspaceId}:`, error);
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

  async updateWorkspace(workspaceId: string, updates: Partial<IWorkspace>): Promise<IWorkspace> {
  const workspace = await this.workspaceRepository.findById(workspaceId);

  if (!workspace) {
    throw new NotFoundException('Workspace not found');
  }

  // Sanitize the settings object
  const sanitizedUpdates: Partial<IWorkspace> = {
    ...updates,
    settings: updates.settings ? {
      allowExternalInvites: updates.settings.allowExternalInvites ?? false,
      defaultPermissions: updates.settings.defaultPermissions ?? 'READ',
      timeZone: updates.settings.timeZone ?? 'UTC',
      workingHours: updates.settings.workingHours ?? {
        start: '09:00',
        end: '17:00',
        workingDays: [1, 2, 3, 4, 5] // Monday to Friday
      }
    } : undefined
  };

  const updatedWorkspace = await this.workspaceRepository.update(workspaceId, sanitizedUpdates);

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
  async getWorkspaceDetails(workspaceId: string, userId: string): Promise<WorkspaceWithMembers> {
    try {
      const workspace = await this.getWorkspaceById(workspaceId, userId);
      
      // Get member count
      const members = await this.userRepository.findWorkspaceUsers(workspaceId);
      const memberCount = members.length;

      // Get team count
      const teams = await this.teamRepository.findByWorkspace(workspaceId);
      const teamCount = teams.length;

      // Get owner information
      const ownerWorkspace = await this.userWorkspaceService.getWorkspaceOwner(workspaceId);
      const owner = await this.userRepository.findById(ownerWorkspace.userId);

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
      this.logger.error(`Error getting workspace details ${workspaceId}:`, error);
      throw error;
    }
  }

  /**
   * Delete workspace (soft delete)
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    try {
      // Validate user is owner
      const userWorkspace = await this.userWorkspaceService.getUserWorkspace(userId, workspaceId);
      if (!userWorkspace || userWorkspace.role !== 'OWNER') {
        throw new WorkspaceError('Only workspace owner can delete workspace', ErrorCodes.INSUFFICIENT_PERMISSIONS);
      }

      const success = await this.workspaceRepository.delete(workspaceId);
      
      if (success) {
        this.logger.info(`Workspace deleted: ${workspaceId} by user ${userId}`);
        
        // Notify all workspace members
        const members = await this.userRepository.findWorkspaceUsers(workspaceId);
        await this.notificationService.sendWorkspaceDeletedNotification(workspaceId, members);
      }

      return success;
    } catch (error) {
      this.logger.error(`Error deleting workspace ${workspaceId}:`, error);
      throw error;
    }
  }

  /**
   * Validate user access to workspace
   */
  async validateWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const userWorkspace = await this.userWorkspaceService.getUserWorkspace(userId, workspaceId);
      return userWorkspace !== null && userWorkspace.isActive;
    } catch (error) {
      this.logger.error(`Error validating workspace access:`, error);
      return false;
    }
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string, userId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    totalTeams: number;
    totalDepartments: number;
    recentActivity: number;
  }> {
    try {
      // Validate access
      await this.getWorkspaceById(workspaceId, userId);

      const members = await this.userRepository.findWorkspaceUsers(workspaceId);
      const teams = await this.teamRepository.findByWorkspace(workspaceId);

      // Get recent activity (last 7 days)
      const recentActivity = await this.getRecentActivityCount(workspaceId);

      return {
        totalMembers: members.length,
        activeMembers: members.filter(m => m.isActive).length,
        totalTeams: teams.length,
        totalDepartments: 0, // TODO: Implement department counting
        recentActivity
      };
    } catch (error) {
      this.logger.error(`Error getting workspace stats ${workspaceId}:`, error);
      throw error;
    }
  }

  private async getRecentActivityCount(workspaceId: string): Promise<number> {
    // TODO: Implement activity tracking
    return 0;
  }
}
