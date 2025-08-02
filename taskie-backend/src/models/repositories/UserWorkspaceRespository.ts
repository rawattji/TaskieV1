import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';
import { UserWorkspace } from '../entities/UserWorkspace';
import { v4 as uuidv4 } from 'uuid';
import { IUserWorkspace, PermissionLevel, WorkspaceRole } from '../../types/workspace.types';

export interface AddUserToWorkspaceDto {
  id?: string,
  user_id: string;
  workspace_id: string;
  role: WorkspaceRole;
  permissions: PermissionLevel;
  team_id?: string;
  joined_at?: Date;
}

export interface UpdateUserWorkspaceDto {
  role?: WorkspaceRole;
  permissions?: PermissionLevel;
  team_id?: string;
}

export class UserWorkspaceRepository extends BaseRepository<IUserWorkspace> {
  constructor(pool: Pool) {
    super(pool);
  }

  /**
   * Find user-workspace relationship by ID
   */
  async findById(id: string): Promise<IUserWorkspace | null> {
    const query = `
      SELECT id, user_id, workspace_id, role, permissions, team_id, is_active, joined_at
      FROM user_workspaces 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [id]);
    
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
  }

  /**
   * Create a new user-workspace relationship
   */
  async create(entity: Omit<IUserWorkspace, 'id' | 'created_at' | 'updated_at'>): Promise<IUserWorkspace> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO user_workspaces (id, user_id, workspace_id, role, permissions, team_id, is_active, joined_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      id,
      entity.user_id,
      entity.workspace_id,
      entity.role,
      entity.permissions,
      entity.team_id,
      entity.is_active,
      now
    ];

    const result = await this.pool.query(query, values);
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
  }

    /**
   * Get all workspaces for a user
   */
  async getUserWorkspaces(user_id: string): Promise<IUserWorkspace[]> {
    const query = `
      SELECT id, user_id, workspace_id, role, permissions, team_id, is_active, joined_at
      FROM user_workspaces 
      WHERE user_id = $1 AND is_active = true
      ORDER BY joined_at DESC
    `;
    
    const result = await this.pool.query(query, [user_id]);
    
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
  }

  /**
   * Update user-workspace relationship
   */
  async update(id: string, updates: Partial<IUserWorkspace>): Promise<IUserWorkspace | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        const dbKey = key === 'userId' ? 'user_id' : 
                     key === 'workspace_id' ? 'workspace_id' :
                     key === 'team_id' ? 'team_id' :
                     key === 'is_active' ? 'is_active' : 
                     key === 'joined_at' ? 'joined_at' : key;
        
        setClause.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE user_workspaces 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex + 1} AND is_active = true
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
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
  }

  /**
   * Soft delete user-workspace relationship
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE user_workspaces 
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;
    
    const result = await this.pool.query(query, [new Date(), id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find user-workspace relationship by user and workspace
   */
  async findByUserAndWorkspace(user_id: string, workspace_id: string): Promise<IUserWorkspace | null> {
    const query = `
      SELECT id, user_id, workspace_id, role, permissions, team_id, is_active, joined_at
      FROM user_workspaces 
      WHERE user_id = $1 AND workspace_id = $2 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [user_id, workspace_id]);
    
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
  }

  /**
   * Add user to workspace
   */
  async addUserToWorkspace(data: AddUserToWorkspaceDto): Promise<IUserWorkspace> {
    // Check if user is already in workspace
    const existing = await this.findByUserAndWorkspace(data.user_id, data.workspace_id);
    if (existing) {
      // If exists but inactive, reactivate
      await this.reactivateUserWorkspace(data.user_id, data.workspace_id);
      return this.findByUserAndWorkspace(data.user_id, data.workspace_id) as Promise<IUserWorkspace>;
    }

    return this.create({
      user_id: data.user_id,
      workspace_id: data.workspace_id,
      role: data.role,
      permissions: data.permissions,
      team_id: data.team_id,
      is_active: true,
      joined_at: data.joined_at
    });
  }

  /**
   * Update user-workspace relationship
   */
  async updateUserWorkspace(
    user_id: string, 
    workspace_id: string, 
    updates: UpdateUserWorkspaceDto,
    updatedByUserId: string
  ): Promise<IUserWorkspace | null> {
    // Check if the updating user has permission
    const updater = await this.findByUserAndWorkspace(updatedByUserId, workspace_id);
    if (!updater || !this.checkPermission(updater.permissions, 'WRITE' as PermissionLevel)) {
      throw new Error('Insufficient permissions to update user workspace');
    }
    
    // Find the userWorkspace to update
    const userWorkspace = await this.findByUserAndWorkspace(user_id, workspace_id);
    if (!userWorkspace) {
      return null;
    }
    
    // Update using the BaseRepository update method
    return this.update(userWorkspace.id, updates);
  }

  /**
   * Remove user from workspace
   */
  async removeUserFromWorkspace(
    user_id: string, 
    workspace_id: string, 
    removedByUserId: string
  ): Promise<boolean> {
    // Check if the removing user has permission
    const remover = await this.findByUserAndWorkspace(removedByUserId, workspace_id);
    if (!remover || !this.checkPermission(remover.permissions, 'WRITE' as PermissionLevel)) {
      throw new Error('Insufficient permissions to remove user from workspace');
    }
    
    // Users cannot remove themselves
    if (user_id === removedByUserId) {
      throw new Error('Cannot remove yourself from workspace');
    }
    
    // Find the userWorkspace to delete
    const userWorkspace = await this.findByUserAndWorkspace(user_id, workspace_id);
    if (!userWorkspace) {
      return false;
    }
    
    // Delete using the BaseRepository delete method
    return this.delete(userWorkspace.id);
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(workspace_id: string): Promise<IUserWorkspace[]> {
    const query = `
      SELECT uw.id, uw.user_id, uw.workspace_id, uw.role, uw.permissions, uw.team_id, uw.is_active, uw.joined_at,
             u.email, u.username, u.first_name, u.last_name, u.avatar
      FROM user_workspaces uw
      INNER JOIN users u ON uw.user_id = u.id
      WHERE uw.workspace_id = $1 AND uw.is_active = true AND u.is_active = true
      ORDER BY u.first_name, u.last_name
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
  }

  /**
   * Check if user has permission in workspace
   */
  async hasPermission(user_id: string, workspace_id: string, permission: PermissionLevel): Promise<boolean> {
    const query = `
      SELECT permissions
      FROM user_workspaces 
      WHERE user_id = $1 AND workspace_id = $2 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [user_id, workspace_id]);
    
    if (result.rows.length === 0) {
      return false;
    }

    const permissions = result.rows[0].permissions;
    return this.checkPermission(permissions, permission);
  }

  /**
   * Check if a permission level includes the required permission
   */
  private checkPermission(userPermissions: PermissionLevel, requiredPermission: PermissionLevel): boolean {
    const permissionHierarchy = {
      [PermissionLevel.NONE]: 0,
      [PermissionLevel.READ]: 1,
      [PermissionLevel.WRITE]: 2,
      [PermissionLevel.FULL]: 3
    };

    return permissionHierarchy[userPermissions] >= permissionHierarchy[requiredPermission];
  }

  /**
   * Assign user to team
   */
  async assignUserToTeam(
    user_id: string, 
    workspace_id: string, 
    team_id: string,
    assignedByUserId: string
  ): Promise<IUserWorkspace | null> {
    // Check if the assigning user has permission
    const assigner = await this.findByUserAndWorkspace(assignedByUserId, workspace_id);
    if (!assigner || !this.checkPermission(assigner.permissions, 'WRITE' as PermissionLevel)) {
      throw new Error('Insufficient permissions to assign user to team');
    }
    
    // Find the userWorkspace to update
    const userWorkspace = await this.findByUserAndWorkspace(user_id, workspace_id);
    if (!userWorkspace) {
      return null;
    }
    
    // Update using the BaseRepository update method
    return this.update(userWorkspace.id, { team_id });
  }

  /**
   * Remove user from team
   */
  async removeUserFromTeam(
    user_id: string, 
    workspace_id: string,
    removedByUserId: string
  ): Promise<IUserWorkspace | null> {
    // Check if the removing user has permission
    const remover = await this.findByUserAndWorkspace(removedByUserId, workspace_id);
    if (!remover || !this.checkPermission(remover.permissions, 'WRITE' as PermissionLevel)) {
      throw new Error('Insufficient permissions to remove user from team');
    }
    
    // Find the userWorkspace to update
    const userWorkspace = await this.findByUserAndWorkspace(user_id, workspace_id);
    if (!userWorkspace) {
      return null;
    }
    
    // Update using the BaseRepository update method
    return this.update(userWorkspace.id, { team_id: undefined });
  }

  /**
   * Reactivate user workspace
   */
  private async reactivateUserWorkspace(user_id: string, workspace_id: string): Promise<void> {
    const query = `
      UPDATE user_workspaces 
      SET is_active = true, updated_at = $1
      WHERE user_id = $2 AND workspace_id = $3
    `;
    
    await this.pool.query(query, [new Date(), user_id, workspace_id]);
  }
}