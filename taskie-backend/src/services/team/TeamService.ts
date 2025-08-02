import { TeamRepository } from '../../models/repositories/TeamRepository';
import { UserRepository } from '../../models/repositories/UserRepository';
import { DepartmentRepository } from '../../models/repositories/DepartmentRepository';
import { UserWorkspaceRepository } from '../../models/repositories/UserWorkspaceRespository';
import { Logger } from '../../utils/logger';
import { ITeam, TeamMember, WorkspaceRole, PermissionLevel } from '../../types/workspace.types';
import { NotFoundError, AuthorizationError } from '../../utils/errors';

export interface CreateTeamDto {
  workspace_id: string;
  department_id: string;
  name: string;
  description?: string;
  lead_id?: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
  lead_id?: string;
}

export class TeamService {
  private teamRepository: TeamRepository;
  private userRepository: UserRepository;
  private departmentRepository: DepartmentRepository;
  private userWorkspaceRepository: UserWorkspaceRepository;
  private logger: Logger;

  constructor(
    teamRepository: TeamRepository,
    userRepository: UserRepository,
    departmentRepository: DepartmentRepository,
    userWorkspaceRepository: UserWorkspaceRepository,
    logger: Logger
  ) {
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;
    this.departmentRepository = departmentRepository;
    this.userWorkspaceRepository = userWorkspaceRepository;
    this.logger = logger;
  }

  /**
   * Create a new team
   */
  async createTeam(teamData: CreateTeamDto, userId: string): Promise<ITeam> {
    // Verify user has access to workspace
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      teamData.workspace_id,
      PermissionLevel.WRITE
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to create teams in this workspace');
    }

    // Verify department exists and belongs to workspace
    const department = await this.departmentRepository.findById(teamData.department_id);
    if (!department || department.workspace_id !== teamData.workspace_id) {
      throw new NotFoundError('Department not found or does not belong to this workspace');
    }

    // If lead_id is provided, verify user exists and has access to workspace
    if (teamData.lead_id) {
      const lead = await this.userRepository.findById(teamData.lead_id);
      if (!lead) {
        throw new NotFoundError('Team lead not found');
      }

      const leadHasAccess = await this.userWorkspaceRepository.hasPermission(
        teamData.lead_id,
        teamData.workspace_id,
        PermissionLevel.READ
      );

      if (!leadHasAccess) {
        throw new AuthorizationError('The selected team lead does not have access to this workspace');
      }
    }

    // Create the team
    const team = await this.teamRepository.create({
      workspace_id: teamData.workspace_id,
      department_id: teamData.department_id,
      name: teamData.name,
      description: teamData.description,
      lead_id: teamData.lead_id,
      is_active: true
    });

    this.logger.info(`Team created: ${team.id} by user ${userId}`);
    return team;
  }

  /**
   * Get team by ID
   */
  async getTeamById(team_id: string, userId: string): Promise<ITeam> {
    // Get team
    const team = await this.teamRepository.findById(team_id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify user has access to workspace
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      team.workspace_id,
      PermissionLevel.READ
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to access this team');
    }

    return team;
  }

  /**
   * Update team
   */
  async updateTeam(team_id: string, updateData: UpdateTeamDto, userId: string): Promise<ITeam> {
    // Get team
    const team = await this.teamRepository.findById(team_id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify user has permission to update team
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      team.workspace_id,
      PermissionLevel.WRITE
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to update this team');
    }

    // If lead_id is provided, verify user exists and has access to workspace
    if (updateData.lead_id) {
      const lead = await this.userRepository.findById(updateData.lead_id);
      if (!lead) {
        throw new NotFoundError('Team lead not found');
      }

      const leadHasAccess = await this.userWorkspaceRepository.hasPermission(
        updateData.lead_id,
        team.workspace_id,
        PermissionLevel.READ
      );

      if (!leadHasAccess) {
        throw new AuthorizationError('The selected team lead does not have access to this workspace');
      }
    }

    // Update the team
    const updatedTeam = await this.teamRepository.update(team_id, updateData);
    if (!updatedTeam) {
      throw new NotFoundError('Team not found');
    }

    this.logger.info(`Team updated: ${team_id} by user ${userId}`);
    return updatedTeam;
  }

  /**
   * Delete team
   */
  async deleteTeam(team_id: string, userId: string): Promise<boolean> {
    // Get team
    const team = await this.teamRepository.findById(team_id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify user has permission to delete team
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      team.workspace_id,
      PermissionLevel.WRITE
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to delete this team');
    }

    // Delete the team
    const success = await this.teamRepository.delete(team_id);
    if (success) {
      this.logger.info(`Team deleted: ${team_id} by user ${userId}`);
    }

    return success;
  }

  /**
   * Get teams by workspace
   */
  async getWorkspaceTeams(workspace_id: string, userId: string): Promise<ITeam[]> {
    // Verify user has access to workspace
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      workspace_id,
      PermissionLevel.READ
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to access this workspace');
    }

    // Get teams
    const teams = await this.teamRepository.findByWorkspace(workspace_id);
    return teams;
  }

  /**
   * Get teams by department
   */
  async getDepartmentTeams(department_id: string, userId: string): Promise<ITeam[]> {
    // Get department
    const department = await this.departmentRepository.findById(department_id);
    if (!department) {
      throw new NotFoundError('Department not found');
    }

    // Verify user has access to workspace
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      department.workspace_id,
      PermissionLevel.READ
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to access this workspace');
    }

    // Get teams
    const teams = await this.teamRepository.findByDepartment(department_id);
    return teams;
  }

  /**
   * Get team members
   */
  async getTeamMembers(team_id: string, userId: string): Promise<TeamMember[]> {
    // Get team
    const team = await this.teamRepository.findById(team_id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify user has access to workspace
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      team.workspace_id,
      PermissionLevel.READ
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to access this team');
    }

    // Get team members
    const members = await this.teamRepository.getTeamMembers(team_id);
    return members;
  }

  /**
   * Assign team lead
   */
  async assignTeamLead(team_id: string, lead_id: string, userId: string): Promise<ITeam> {
    // Get team
    const team = await this.teamRepository.findById(team_id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify user has permission to update team
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      team.workspace_id,
      PermissionLevel.WRITE
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to update this team');
    }

    // Verify lead exists and has access to workspace
    const lead = await this.userRepository.findById(lead_id);
    if (!lead) {
      throw new NotFoundError('Team lead not found');
    }

    const leadHasAccess = await this.userWorkspaceRepository.hasPermission(
      lead_id,
      team.workspace_id,
      PermissionLevel.READ
    );

    if (!leadHasAccess) {
      throw new AuthorizationError('The selected team lead does not have access to this workspace');
    }

    // Assign team lead
    const updatedTeam = await this.teamRepository.assignTeamLead(team_id, lead_id);
    if (!updatedTeam) {
      throw new NotFoundError('Team not found');
    }

    this.logger.info(`Team lead assigned: ${lead_id} to team ${team_id} by user ${userId}`);
    return updatedTeam;
  }

  /**
   * Remove team lead
   */
  async removeTeamLead(team_id: string, userId: string): Promise<ITeam> {
    // Get team
    const team = await this.teamRepository.findById(team_id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify user has permission to update team
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      team.workspace_id,
      PermissionLevel.WRITE
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to update this team');
    }

    // Remove team lead
    const updatedTeam = await this.teamRepository.removeTeamLead(team_id);
    if (!updatedTeam) {
      throw new NotFoundError('Team not found');
    }

    this.logger.info(`Team lead removed from team ${team_id} by user ${userId}`);
    return updatedTeam;
  }

  /**
   * Add user to team
   */
  async addUserToTeam(team_id: string, userIdToAdd: string, userId: string): Promise<void> {
    // Get team
    const team = await this.teamRepository.findById(team_id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify user has permission to update team
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      team.workspace_id,
      PermissionLevel.WRITE
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to update this team');
    }

    // Verify user to add exists and has access to workspace
    const userToAdd = await this.userRepository.findById(userIdToAdd);
    if (!userToAdd) {
      throw new NotFoundError('User not found');
    }

    const userHasAccess = await this.userWorkspaceRepository.hasPermission(
      userIdToAdd,
      team.workspace_id,
      PermissionLevel.READ
    );

    if (!userHasAccess) {
      throw new AuthorizationError('The selected user does not have access to this workspace');
    }

    // Add user to team
    await this.userWorkspaceRepository.assignUserToTeam(
      userIdToAdd,
      team.workspace_id,
      team_id,
      userId
    );

    this.logger.info(`User ${userIdToAdd} added to team ${team_id} by user ${userId}`);
  }

  /**
   * Remove user from team
   */
  async removeUserFromTeam(team_id: string, userIdToRemove: string, userId: string): Promise<void> {
    // Get team
    const team = await this.teamRepository.findById(team_id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify user has permission to update team
    const hasWorkspaceAccess = await this.userWorkspaceRepository.hasPermission(
      userId,
      team.workspace_id,
      PermissionLevel.WRITE
    );

    if (!hasWorkspaceAccess) {
      throw new AuthorizationError('You do not have permission to update this team');
    }

    // Remove user from team
    await this.userWorkspaceRepository.removeUserFromTeam(
      userIdToRemove,
      team.workspace_id,
      userId
    );

    this.logger.info(`User ${userIdToRemove} removed from team ${team_id} by user ${userId}`);
  }
}