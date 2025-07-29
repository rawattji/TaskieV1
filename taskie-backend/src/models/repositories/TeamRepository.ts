import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Team } from '../entities/Team';
import { v4 as uuidv4 } from 'uuid';
import { IDepartment, ITeam, IUser } from '../../types/workspace.types';

export interface TeamWithMembers extends ITeam {
  memberCount: number;
  members: IUser[];
  lead?: IUser;
  department: IDepartment;
}

export interface TeamMember {
  userId: string;
  user: IUser;
  joinedAt: Date;
  role: string;
  isActive: boolean;
}

export class TeamRepository extends BaseRepository<ITeam> {
  constructor(pool: Pool) {
    super(pool);
  }

  /**
   * Find team by ID
   */
  async findById(id: string): Promise<ITeam | null> {
    const query = `
      SELECT id, workspace_id, department_id, name, description, lead_id, is_active, created_at, updated_at
      FROM teams 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Create new team
   */
  async create(teamData: Omit<ITeam, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITeam> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO teams (id, workspace_id, department_id, name, description, lead_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      id,
      teamData.workspaceId,
      teamData.departmentId,
      teamData.name,
      teamData.description,
      teamData.leadId,
      teamData.isActive,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Update team
   */
  async update(id: string, updates: Partial<ITeam>): Promise<ITeam | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbKey = key === 'workspaceId' ? 'workspace_id' : 
                     key === 'departmentId' ? 'department_id' :
                     key === 'leadId' ? 'lead_id' :
                     key === 'isActive' ? 'is_active' : 
                     key === 'updatedAt' ? 'updated_at' : key;
        
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
      UPDATE teams 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Soft delete team
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE teams 
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;
    
    const result = await this.pool.query(query, [new Date(), id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find teams by workspace
   */
  async findByWorkspace(workspaceId: string): Promise<ITeam[]> {
    const query = `
      SELECT id, workspace_id, department_id, name, description, lead_id, is_active, created_at, updated_at
      FROM teams
      WHERE workspace_id = $1 AND is_active = true
      ORDER BY name ASC
    `;
    
    const result = await this.pool.query(query, [workspaceId]);
    
    return result.rows.map(row => new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find teams by department
   */
  async findByDepartment(departmentId: string): Promise<ITeam[]> {
    const query = `
      SELECT id, workspace_id, department_id, name, description, lead_id, is_active, created_at, updated_at
      FROM teams
      WHERE department_id = $1 AND is_active = true
      ORDER BY name ASC
    `;
    
    const result = await this.pool.query(query, [departmentId]);
    
    return result.rows.map(row => new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find team with detailed information including members
   */
  async findTeamWithDetails(teamId: string): Promise<TeamWithMembers | null> {
    const teamQuery = `
      SELECT t.id, t.workspace_id, t.department_id, t.name, t.description, t.lead_id, t.is_active, 
             t.created_at, t.updated_at,
             d.id as dept_id, d.name as dept_name, d.description as dept_description,
             d.parent_department_id, d.manager_id, d.is_active as dept_active,
             d.created_at as dept_created_at, d.updated_at as dept_updated_at
      FROM teams t
      INNER JOIN departments d ON t.department_id = d.id
      WHERE t.id = $1 AND t.is_active = true
    `;

    const teamResult = await this.pool.query(teamQuery, [teamId]);
    
    if (teamResult.rows.length === 0) {
      return null;
    }

    const teamRow = teamResult.rows[0];
    
    // Get team members
    const membersQuery = `
      SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.avatar, u.is_active,
             u.created_at, u.updated_at, uw.joined_at, uw.role
      FROM users u
      INNER JOIN user_workspaces uw ON u.id = uw.user_id
      WHERE uw.team_id = $1 AND uw.is_active = true AND u.is_active = true
      ORDER BY uw.joined_at ASC
    `;

    const membersResult = await this.pool.query(membersQuery, [teamId]);
    
    const members = membersResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      avatar: row.avatar,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // Get team lead if exists
    let lead = undefined;
    if (teamRow.lead_id) {
      const leadQuery = `
        SELECT id, email, username, first_name, last_name, avatar, is_active, created_at, updated_at
        FROM users
        WHERE id = $1 AND is_active = true
      `;
      
      const leadResult = await this.pool.query(leadQuery, [teamRow.lead_id]);
      
      if (leadResult.rows.length > 0) {
        const leadRow = leadResult.rows[0];
        lead = {
          id: leadRow.id,
          email: leadRow.email,
          username: leadRow.username,
          firstName: leadRow.first_name,
          lastName: leadRow.last_name,
          avatar: leadRow.avatar,
          isActive: leadRow.is_active,
          createdAt: leadRow.created_at,
          updatedAt: leadRow.updated_at
        };
      }
    }

    const team = new Team(
      teamRow.id,
      teamRow.workspace_id,
      teamRow.department_id,
      teamRow.name,
      teamRow.is_active,
      teamRow.description,
      teamRow.lead_id,
      teamRow.created_at,
      teamRow.updated_at
    );

    const department = {
      id: teamRow.dept_id,
      workspaceId: teamRow.workspace_id,
      name: teamRow.dept_name,
      description: teamRow.dept_description,
      parentDepartmentId: teamRow.parent_department_id,
      managerId: teamRow.manager_id,
      isActive: teamRow.dept_active,
      createdAt: teamRow.dept_created_at,
      updatedAt: teamRow.dept_updated_at
    };

    return {
      ...team,
      memberCount: members.length,
      members,
      lead,
      department
    };
  }

  /**
   * Find teams by user (teams where user is a member)
   */
  async findTeamsByUser(userId: string): Promise<ITeam[]> {
    const query = `
      SELECT DISTINCT t.id, t.workspace_id, t.department_id, t.name, t.description, 
             t.lead_id, t.is_active, t.created_at, t.updated_at
      FROM teams t
      INNER JOIN user_workspaces uw ON t.id = uw.team_id
      WHERE uw.user_id = $1 AND t.is_active = true AND uw.is_active = true
      ORDER BY t.name ASC
    `;
    
    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map(row => new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find teams led by user
   */
  async findTeamsLedByUser(userId: string): Promise<ITeam[]> {
    const query = `
      SELECT id, workspace_id, department_id, name, description, lead_id, is_active, created_at, updated_at
      FROM teams
      WHERE lead_id = $1 AND is_active = true
      ORDER BY name ASC
    `;
    
    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map(row => new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Get team members with their roles
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const query = `
      SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.avatar, u.is_active,
             u.created_at, u.updated_at, uw.joined_at, uw.role, uw.is_active as member_active
      FROM users u
      INNER JOIN user_workspaces uw ON u.id = uw.user_id
      WHERE uw.team_id = $1 AND uw.is_active = true AND u.is_active = true
      ORDER BY uw.joined_at ASC
    `;

    const result = await this.pool.query(query, [teamId]);
    
    return result.rows.map(row => ({
      userId: row.id,
      user: {
        id: row.id,
        email: row.email,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        avatar: row.avatar,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      },
      joinedAt: row.joined_at,
      role: row.role,
      isActive: row.member_active
    }));
  }

  /**
   * Check if user is member of team
   */
  async isUserMemberOfTeam(userId: string, teamId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM user_workspaces uw
      INNER JOIN teams t ON uw.team_id = t.id
      WHERE uw.user_id = $1 AND uw.team_id = $2 AND uw.is_active = true AND t.is_active = true
    `;

    const result = await this.pool.query(query, [userId, teamId]);
    return result.rows.length > 0;
  }

  /**
   * Check if user is lead of team
   */
  async isUserTeamLead(userId: string, teamId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM teams
      WHERE id = $1 AND lead_id = $2 AND is_active = true
    `;

    const result = await this.pool.query(query, [teamId, userId]);
    return result.rows.length > 0;
  }

  /**
   * Assign team lead
   */
  async assignTeamLead(teamId: string, userId: string): Promise<ITeam | null> {
    return this.withTransaction(async (client: PoolClient) => {
      // Verify user is member of the team
      const memberCheckQuery = `
        SELECT 1
        FROM user_workspaces uw
        WHERE uw.user_id = $1 AND uw.team_id = $2 AND uw.is_active = true
      `;
      
      const memberResult = await client.query(memberCheckQuery, [userId, teamId]);
      
      if (memberResult.rows.length === 0) {
        throw new Error('User is not a member of the team');
      }

      // Update team lead
      const updateQuery = `
        UPDATE teams 
        SET lead_id = $1, updated_at = $2
        WHERE id = $3 AND is_active = true
        RETURNING *
      `;

      const result = await client.query(updateQuery, [userId, new Date(), teamId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new Team(
        row.id,
        row.workspace_id,
        row.department_id,
        row.name,
        row.is_active,
        row.description,
        row.lead_id,
        row.created_at,
        row.updated_at
      );
    });
  }

  /**
   * Remove team lead
   */
  async removeTeamLead(teamId: string): Promise<ITeam | null> {
    const query = `
      UPDATE teams 
      SET lead_id = NULL, updated_at = $1
      WHERE id = $2 AND is_active = true
      RETURNING *
    `;

    const result = await this.pool.query(query, [new Date(), teamId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId: string): Promise<{
    memberCount: number;
    activeTaskCount: number;
    completedTaskCount: number;
    averageTaskCompletion: number;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT uw.user_id) as member_count,
        COUNT(CASE WHEN t.status IN ('CREATED', 'IN_PROGRESS', 'REVIEW') THEN 1 END) as active_tasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completed_tasks,
        COALESCE(AVG(CASE WHEN t.status = 'COMPLETED' AND t.end_date IS NOT NULL AND t.start_date IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (t.end_date - t.start_date)) / 86400 END), 0) as avg_completion_days
      FROM user_workspaces uw
      INNER JOIN teams team ON uw.team_id = team.id
      LEFT JOIN tasks t ON t.assigned_to = uw.user_id AND t.workspace_id = team.workspace_id
      WHERE uw.team_id = $1 AND uw.is_active = true AND team.is_active = true
      GROUP BY team.id
    `;

    const result = await this.pool.query(statsQuery, [teamId]);
    
    if (result.rows.length === 0) {
      return {
        memberCount: 0,
        activeTaskCount: 0,
        completedTaskCount: 0,
        averageTaskCompletion: 0
      };
    }

    const row = result.rows[0];
    return {
      memberCount: parseInt(row.member_count) || 0,
      activeTaskCount: parseInt(row.active_tasks) || 0,
      completedTaskCount: parseInt(row.completed_tasks) || 0,
      averageTaskCompletion: parseFloat(row.avg_completion_days) || 0
    };
  }

  /**
   * Search teams by name within workspace
   */
  async searchTeamsByName(workspaceId: string, searchTerm: string, limit: number = 20): Promise<ITeam[]> {
    const query = `
      SELECT id, workspace_id, department_id, name, description, lead_id, is_active, created_at, updated_at
      FROM teams
      WHERE workspace_id = $1 AND is_active = true 
        AND (name ILIKE $2 OR description ILIKE $2)
      ORDER BY 
        CASE WHEN name ILIKE $3 THEN 1 ELSE 2 END,
        name ASC
      LIMIT $4
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const exactPattern = `${searchTerm}%`;
    
    const result = await this.pool.query(query, [workspaceId, searchPattern, exactPattern, limit]);
    
    return result.rows.map(row => new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Get teams with pagination
   */
  async getTeamsWithPagination(
    workspaceId: string, 
    page: number = 1, 
    limit: number = 20,
    departmentId?: string
  ): Promise<{
    teams: ITeam[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE workspace_id = $1 AND is_active = true';
    let params: any[] = [workspaceId];
    let paramIndex = 2;

    if (departmentId) {
      whereClause += ` AND department_id = ${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM teams ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get teams with pagination
    const teamsQuery = `
      SELECT id, workspace_id, department_id, name, description, lead_id, is_active, created_at, updated_at
      FROM teams
      ${whereClause}
      ORDER BY name ASC
      LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
    `;

    params.push(limit, offset);
    const teamsResult = await this.pool.query(teamsQuery, params);
    
    const teams = teamsResult.rows.map(row => new Team(
      row.id,
      row.workspace_id,
      row.department_id,
      row.name,
      row.is_active,
      row.description,
      row.lead_id,
      row.created_at,
      row.updated_at
    ));

    return {
      teams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Bulk update teams
   */
  async bulkUpdateTeams(teamIds: string[], updates: Partial<ITeam>): Promise<ITeam[]> {
    if (teamIds.length === 0) return [];

    return this.withTransaction(async (client: PoolClient) => {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          const dbKey = key === 'workspaceId' ? 'workspace_id' : 
                       key === 'departmentId' ? 'department_id' :
                       key === 'leadId' ? 'lead_id' :
                       key === 'isActive' ? 'is_active' : 
                       key === 'updatedAt' ? 'updated_at' : key;
          
          setClause.push(`${dbKey} = ${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        // If no updates, just return the existing teams
        const selectQuery = `
          SELECT id, workspace_id, department_id, name, description, lead_id, is_active, created_at, updated_at
          FROM teams
          WHERE id = ANY($1) AND is_active = true
        `;
        const result = await client.query(selectQuery, [teamIds]);
        
        return result.rows.map(row => new Team(
          row.id,
          row.workspace_id,
          row.department_id,
          row.name,
          row.is_active,
          row.description,
          row.lead_id,
          row.created_at,
          row.updated_at
        ));
      }

      setClause.push(`updated_at = ${paramIndex}`);
      values.push(new Date());
      values.push(teamIds);

      const query = `
        UPDATE teams 
        SET ${setClause.join(', ')}
        WHERE id = ANY(${paramIndex + 1}) AND is_active = true
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      return result.rows.map(row => new Team(
        row.id,
        row.workspace_id,
        row.department_id,
        row.name,
        row.is_active,
        row.description,
        row.lead_id,
        row.created_at,
        row.updated_at
      ));
    });
  }
}