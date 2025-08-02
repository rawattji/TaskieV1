import { Pool } from 'pg';
import { UserWorkspace } from '../../models/entities/UserWorkspace';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../utils/logger';
import { WorkspaceError, ErrorCodes } from '../../utils/errors'
import { IUserWorkspace, PermissionLevel, WorkspaceRole } from '../../types/workspace.types';

export interface AddUserToWorkspaceDto {
  userId: string;
  workspace_id: string;
  role: WorkspaceRole;
  permissions: PermissionLevel;
  team_id?: string;
}

export interface UpdateUserWorkspaceDto {
  role?: WorkspaceRole;
  permissions?: PermissionLevel;
  team_id?: string;
}

export class UserWorkspaceService {
  private pool: Pool;
  private logger: Logger;

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  /**
   * Add user to workspace
   */
  async addUserToWorkspace(data: AddUserToWorkspaceDto): Promise<IUserWorkspace> {
    try {
      // Check if user is already in workspace
      const existing = await this.getUserWorkspace(data.userId, data.workspace_id);
      if (existing) {
        throw new WorkspaceError('User already in workspace', ErrorCodes.USER_ALREADY_IN_WORKSPACE);
      }

      const id = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO user_workspaces (id, user_id, workspace_id, team_id, role, permissions, joined_at, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        id,
        data.userId,
        data.workspace_id,
        data.team_id,
        data.role,
        data.permissions,
        now,
        true
      ];

      const result = await this.pool.query(query, values);
      const row = result.rows[0];

      const userWorkspace = new UserWorkspace(
        row.id,
        row.user_id,
        row.workspace_id,
        row.role,
        row.permissions,
        row.is_active,
        row.team_id,
        row.joined_at
      );

      this.logger.info(`User ${data.userId} added to workspace ${data.workspace_id}`);

      return userWorkspace;
    } catch (error) {
      this.logger.error(`Error adding user to workspace: ${error}`);

      throw error;
    }
  }

  /**
   * Get user workspace relationship
   */
  async getUserWorkspace(userId: string, workspace_id: string): Promise<UserWorkspace | null> {
    try {
      const query = `
        SELECT id, user_id, workspace_id, team_id, role, permissions, joined_at, is_active
        FROM user_workspaces
        WHERE user_id = $1 AND workspace_id = $2 AND is_active = true
      `;

      const result = await this.pool.query(query, [userId, workspace_id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new UserWorkspace(
        row.id,
        row.user_id,
        row.workspace_id,
        row.role,
        row.permissions,
        row.is_active,
        row.team_id,
        row.joined_at
      );
    } catch (error) {
      this.logger.error('Error getting user workspace:', error);
      throw error;
    }
  }

  /**
   * Update user workspace relationship
   */
  async updateUserWorkspace(
    userId: string,
    workspace_id: string,
    updates: UpdateUserWorkspaceDto,
    updatedBy: string
  ): Promise<IUserWorkspace> {
    try {
      // Validate updater has permission
      const updaterWorkspace = await this.getUserWorkspace(updatedBy, workspace_id);
      if (!updaterWorkspace || (updaterWorkspace.role !== 'OWNER' && updaterWorkspace.role !== 'ADMIN')) {
        throw new WorkspaceError('Insufficient permissions', ErrorCodes.INSUFFICIENT_PERMISSIONS);
      }

      const setClause: string[] = [];
      const values: (string | number | boolean | null)[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key === 'team_id' ? 'team_id' : key;
          setClause.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        const existing = await this.getUserWorkspace(userId, workspace_id);
        if (!existing) {
          throw new WorkspaceError('User workspace relationship not found', ErrorCodes.USER_WORKSPACE_NOT_FOUND);
        }
        return existing;
      }

      values.push(userId, workspace_id);

      const query = `
        UPDATE user_workspaces
        SET ${setClause.join(', ')}
        WHERE user_id = $${paramIndex} AND workspace_id = $${paramIndex + 1} AND is_active = true
        RETURNING *
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new WorkspaceError('User workspace relationship not found', ErrorCodes.USER_WORKSPACE_NOT_FOUND);
      }

      const row = result.rows[0];
      const userWorkspace = new UserWorkspace(
        row.id,
        row.user_id,
        row.workspace_id,
        row.role,
        row.permissions,
        row.is_active,
        row.team_id,
        row.joined_at
      );

      this.logger.info(`User workspace updated: ${userId} in ${workspace_id} by ${updatedBy}`);

      return userWorkspace;
    } catch (error) {
      this.logger.error('Error updating user workspace:', error);
      throw error;
    }
  }

  /**
   * Remove user from workspace
   */
  async removeUserFromWorkspace(userId: string, workspace_id: string, removedBy: string): Promise<boolean> {
    try {
      // Validate remover has permission
      const removerWorkspace = await this.getUserWorkspace(removedBy, workspace_id);
      if (!removerWorkspace || (removerWorkspace.role !== 'OWNER' && removerWorkspace.role !== 'ADMIN')) {
        throw new WorkspaceError('Insufficient permissions', ErrorCodes.INSUFFICIENT_PERMISSIONS);
      }

      // Don't allow removing the owner
      const targetWorkspace = await this.getUserWorkspace(userId, workspace_id);
      if (targetWorkspace?.role === 'OWNER') {
        throw new WorkspaceError('Cannot remove workspace owner', ErrorCodes.CANNOT_REMOVE_OWNER);
      }

      const query = `
        UPDATE user_workspaces
        SET is_active = false
        WHERE user_id = $1 AND workspace_id = $2
      `;

      const result = await this.pool.query(query, [userId, workspace_id]);

      if ( result.rowCount !== null && result.rowCount > 0) {
        this.logger.info(`User ${userId} removed from workspace ${workspace_id} by ${removedBy}`);
      }

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error removing user from workspace:', error);
      throw error;
    }
  }

  /**
   * Get workspace owner
   */
  async getWorkspaceOwner(workspace_id: string): Promise<IUserWorkspace> {
    try {
      const query = `
        SELECT id, user_id, workspace_id, team_id, role, permissions, joined_at, is_active
        FROM user_workspaces
        WHERE workspace_id = $1 AND role = 'OWNER' AND is_active = true
      `;

      const result = await this.pool.query(query, [workspace_id]);

      if (result.rows.length === 0) {
        throw new WorkspaceError('Workspace owner not found', ErrorCodes.WORKSPACE_OWNER_NOT_FOUND);
      }

      const row = result.rows[0];
      return new UserWorkspace(
        row.id,
        row.user_id,
        row.workspace_id,
        row.role,
        row.permissions,
        row.is_active,
        row.team_id,
        row.joined_at
      );
    } catch (error) {
      this.logger.error('Error getting workspace owner:', error);
      throw error;
    }
  }

  /**
   * Get workspace members with their roles
   */
  async getWorkspaceMembers(workspace_id: string): Promise<IUserWorkspace[]> {
    try {
      const query = `
        SELECT id, user_id, workspace_id, team_id, role, permissions, joined_at, is_active
        FROM user_workspaces
        WHERE workspace_id = $1 AND is_active = true
        ORDER BY joined_at ASC
      `;

      const result = await this.pool.query(query, [workspace_id]);

      return result.rows.map(row => new UserWorkspace(
        row.id,
        row.user_id,
        row.workspace_id,
        row.role,
        row.permissions,
        row.is_active,
        row.team_id,
        row.joined_at
      ));
    } catch (error) {
      this.logger.error('Error getting workspace members:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific permission in workspace
   */
  async hasPermission(
    userId: string, 
    workspace_id: string, 
    requiredPermission: PermissionLevel
  ): Promise<boolean> {
    try {
      const userWorkspace = await this.getUserWorkspace(userId, workspace_id);
      return userWorkspace ? userWorkspace.hasPermission(requiredPermission) : false;
    } catch (error) {
      this.logger.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Assign user to team within workspace
   */
  async assignUserToTeam(userId: string, workspace_id: string, team_id: string, assignedBy: string): Promise<IUserWorkspace> {
    try {
      return await this.updateUserWorkspace(userId, workspace_id, { team_id }, assignedBy);
    } catch (error) {
      this.logger.error('Error assigning user to team:', error);
      throw error;
    }
  }

  /**
   * Remove user from team within workspace
   */
  async removeUserFromTeam(userId: string, workspace_id: string, removedBy: string): Promise<IUserWorkspace> {
    try {
      return await this.updateUserWorkspace(userId, workspace_id, { team_id: undefined }, removedBy);
    } catch (error) {
      this.logger.error('Error removing user from team:', error);
      throw error;
    }
  }
}
