import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Initiative } from '../entities/Initiative';
import { v4 as uuidv4 } from 'uuid';
import { IInitiative } from '../../types/task.types';

export class InitiativeRepository extends BaseRepository<IInitiative> {
  constructor(pool: Pool) {
    super(pool);
  }

  /**
   * Find initiative by ID
   */
  async findById(id: string): Promise<IInitiative | null> {
    const query = `
      SELECT id, name, description, workspace_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM initiatives 
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Initiative(
      row.id,
      row.name,
      row.workspace_id,
      row.department_id,
      row.team_id,
      row.assignee_id,
      row.creator_id,
      row.priority,
      row.status,
      row.description,
      row.start_date,
      row.end_date,
      row.estimated_hours,
      row.tags || [],
      'INITIATIVE',
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Create new initiative
   */
  async create(initiativeData: Omit<IInitiative, 'id' | 'created_at' | 'updated_at'>): Promise<IInitiative> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO initiatives (id, name, description, workspace_id, department_id, team_id, assignee_id, 
                             creator_id, priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const values = [
      id,
      initiativeData.name,
      initiativeData.description,
      initiativeData.workspace_id,
      initiativeData.department_id,
      initiativeData.team_id,
      initiativeData.assignee_id,
      initiativeData.creator_id,
      initiativeData.priority,
      initiativeData.status,
      initiativeData.start_date,
      initiativeData.end_date,
      initiativeData.estimated_hours,
      JSON.stringify(initiativeData.tags || []),
      'INITIATIVE',
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return new Initiative(
      row.id,
      row.name,
      row.workspace_id,
      row.department_id,
      row.team_id,
      row.assignee_id,
      row.creator_id,
      row.priority,
      row.status,
      row.description,
      row.start_date,
      row.end_date,
      row.estimated_hours,
      row.tags || [],
      'INITIATIVE',
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Update initiative
   */
  async update(id: string, updates: Partial<IInitiative>): Promise<IInitiative | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        const dbKey = key === 'workspace_id' ? 'workspace_id' : 
                     key === 'department_id' ? 'department_id' :
                     key === 'team_id' ? 'team_id' :
                     key === 'assignee_id' ? 'assignee_id' :
                     key === 'creator_id' ? 'creator_id' :
                     key === 'start_date' ? 'start_date' :
                     key === 'end_date' ? 'end_date' :
                     key === 'estimated_hours' ? 'estimated_hours' :
                     key === 'updated_at' ? 'updated_at' : key;
        
        if (key === 'tags') {
          setClause.push(`${dbKey} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
        }
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
      UPDATE initiatives 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Initiative(
      row.id,
      row.name,
      row.workspace_id,
      row.department_id,
      row.team_id,
      row.assignee_id,
      row.creator_id,
      row.priority,
      row.status,
      row.description,
      row.start_date,
      row.end_date,
      row.estimated_hours,
      row.tags || [],
      'INITIATIVE',
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Delete initiative
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM initiatives WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find initiatives by workspace
   */
  async findByWorkspace(workspace_id: string): Promise<IInitiative[]> {
    const query = `
      SELECT id, name, description, workspace_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM initiatives
      WHERE workspace_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [workspace_id]);
    
    return result.rows.map(row => new Initiative(
      row.id,
      row.name,
      row.workspace_id,
      row.department_id,
      row.team_id,
      row.assignee_id,
      row.creator_id,
      row.priority,
      row.status,
      row.description,
      row.start_date,
      row.end_date,
      row.estimated_hours,
      row.tags || [],
      'INITIATIVE',
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find initiatives by assignee
   */
  async findByAssignee(assignee_id: string): Promise<IInitiative[]> {
    const query = `
      SELECT id, name, description, workspace_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM initiatives
      WHERE assignee_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [assignee_id]);
    
    return result.rows.map(row => new Initiative(
      row.id,
      row.name,
      row.workspace_id,
      row.department_id,
      row.team_id,
      row.assignee_id,
      row.creator_id,
      row.priority,
      row.status,
      row.description,
      row.start_date,
      row.end_date,
      row.estimated_hours,
      row.tags || [],
      'INITIATIVE',
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find initiatives by creator
   */
  async findByCreator(creator_id: string): Promise<IInitiative[]> {
    const query = `
      SELECT id, name, description, workspace_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM initiatives
      WHERE creator_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [creator_id]);
    
    return result.rows.map(row => new Initiative(
      row.id,
      row.name,
      row.workspace_id,
      row.department_id,
      row.team_id,
      row.assignee_id,
      row.creator_id,
      row.priority,
      row.status,
      row.description,
      row.start_date,
      row.end_date,
      row.estimated_hours,
      row.tags || [],
      'INITIATIVE',
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Get initiatives with pagination
   */
  async getInitiativesWithPagination(
    workspace_id: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      assignee_id?: string;
      creator_id?: string;
      priority?: string;
      status?: string;
      department_id?: string;
      team_id?: string;
    }
  ): Promise<{
    initiatives: IInitiative[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE workspace_id = $1';
    let params: any[] = [workspace_id];
    let paramIndex = 2;

    if (filters) {
      if (filters.assignee_id) {
        whereClause += ` AND assignee_id = $${paramIndex}`;
        params.push(filters.assignee_id);
        paramIndex++;
      }
      
      if (filters.creator_id) {
        whereClause += ` AND creator_id = $${paramIndex}`;
        params.push(filters.creator_id);
        paramIndex++;
      }
      
      if (filters.priority) {
        whereClause += ` AND priority = $${paramIndex}`;
        params.push(filters.priority);
        paramIndex++;
      }
      
      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }
      
      if (filters.department_id) {
        whereClause += ` AND department_id = $${paramIndex}`;
        params.push(filters.department_id);
        paramIndex++;
      }
      
      if (filters.team_id) {
        whereClause += ` AND team_id = $${paramIndex}`;
        params.push(filters.team_id);
        paramIndex++;
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM initiatives ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get initiatives with pagination
    const initiativesQuery = `
      SELECT id, name, description, workspace_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM initiatives
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const initiativesResult = await this.pool.query(initiativesQuery, params);
    
    const initiatives = initiativesResult.rows.map(row => new Initiative(
      row.id,
      row.name,
      row.workspace_id,
      row.department_id,
      row.team_id,
      row.assignee_id,
      row.creator_id,
      row.priority,
      row.status,
      row.description,
      row.start_date,
      row.end_date,
      row.estimated_hours,
      row.tags || [],
      'INITIATIVE',
      row.created_at,
      row.updated_at
    ));

    return {
      initiatives,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}