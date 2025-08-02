import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Story } from '../entities/Story';
import { v4 as uuidv4 } from 'uuid';
import { IStory } from '../../types/task.types';

export class StoryRepository extends BaseRepository<IStory> {
  constructor(pool: Pool) {
    super(pool);
  }

  /**
   * Find story by ID
   */
  async findById(id: string): Promise<IStory | null> {
    const query = `
      SELECT id, name, description, workspace_id, epic_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM stories 
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Story(
      row.id,
      row.name,
      row.workspace_id,
      row.epic_id,
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
      'STORY',
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Create new story
   */
  async create(storyData: Omit<IStory, 'id' | 'created_at' | 'updated_at'>): Promise<IStory> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO stories (id, name, description, workspace_id, epic_id, department_id, team_id, assignee_id, 
                          creator_id, priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const values = [
      id,
      storyData.name,
      storyData.description,
      storyData.workspace_id,
      storyData.epic_id,
      storyData.department_id,
      storyData.team_id,
      storyData.assignee_id,
      storyData.creator_id,
      storyData.priority,
      storyData.status,
      storyData.start_date,
      storyData.end_date,
      storyData.estimated_hours,
      JSON.stringify(storyData.tags || []),
      'STORY',
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return new Story(
      row.id,
      row.name,
      row.workspace_id,
      row.epic_id,
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
      'STORY',
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Update story
   */
  async update(id: string, updates: Partial<IStory>): Promise<IStory | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        const dbKey = key === 'workspace_id' ? 'workspace_id' : 
                     key === 'epic_id' ? 'epic_id' :
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
      UPDATE stories 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Story(
      row.id,
      row.name,
      row.workspace_id,
      row.epic_id,
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
      'STORY',
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Delete story
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM stories WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find stories by workspace
   */
  async findByWorkspace(workspace_id: string): Promise<IStory[]> {
    const query = `
      SELECT id, name, description, workspace_id, epic_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM stories
      WHERE workspace_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [workspace_id]);
    
    return result.rows.map(row => new Story(
      row.id,
      row.name,
      row.workspace_id,
      row.epic_id,
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
      'STORY',
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find stories by epic
   */
  async findByEpic(epic_id: string): Promise<IStory[]> {
    const query = `
      SELECT id, name, description, workspace_id, epic_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM stories
      WHERE epic_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [epic_id]);
    
    return result.rows.map(row => new Story(
      row.id,
      row.name,
      row.workspace_id,
      row.epic_id,
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
      'STORY',
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find stories by assignee
   */
  async findByAssignee(assignee_id: string): Promise<IStory[]> {
    const query = `
      SELECT id, name, description, workspace_id, epic_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM stories
      WHERE assignee_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [assignee_id]);
    
    return result.rows.map(row => new Story(
      row.id,
      row.name,
      row.workspace_id,
      row.epic_id,
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
      'STORY',
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Get stories with pagination
   */
  async getStoriesWithPagination(
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
      epic_id?: string;
    }
  ): Promise<{
    stories: IStory[];
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
      
      if (filters.epic_id) {
        whereClause += ` AND epic_id = $${paramIndex}`;
        params.push(filters.epic_id);
        paramIndex++;
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM stories ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get stories with pagination
    const storiesQuery = `
      SELECT id, name, description, workspace_id, epic_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM stories
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const storiesResult = await this.pool.query(storiesQuery, params);
    
    const stories = storiesResult.rows.map(row => new Story(
      row.id,
      row.name,
      row.workspace_id,
      row.epic_id,
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
      'STORY',
      row.created_at,
      row.updated_at
    ));

    return {
      stories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}