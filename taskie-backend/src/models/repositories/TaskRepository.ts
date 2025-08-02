import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Task } from '../entities/Task';
import { v4 as uuidv4 } from 'uuid';
import { ITask } from '../../types/task.types';

export class TaskRepository extends BaseRepository<ITask> {
  constructor(pool: Pool) {
    super(pool);
  }

  /**
   * Find task by ID
   */
  async findById(id: string): Promise<ITask | null> {
    const query = `
      SELECT id, name, description, workspace_id, story_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM tasks 
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Task(
      row.id,
      row.name,
      row.workspace_id,
      row.story_id,
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
      'TASK',
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Create new task
   */
  async create(taskData: Omit<ITask, 'id' | 'created_at' | 'updated_at'>): Promise<ITask> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO tasks (id, name, description, workspace_id, story_id, department_id, team_id, assignee_id, 
                        creator_id, priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const values = [
      id,
      taskData.name,
      taskData.description,
      taskData.workspace_id,
      taskData.story_id,
      taskData.department_id,
      taskData.team_id,
      taskData.assignee_id,
      taskData.creator_id,
      taskData.priority,
      taskData.status,
      taskData.start_date,
      taskData.end_date,
      taskData.estimated_hours,
      JSON.stringify(taskData.tags || []),
      'TASK',
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return new Task(
      row.id,
      row.name,
      row.workspace_id,
      row.story_id,
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
      'TASK',
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Update task
   */
  async update(id: string, updates: Partial<ITask>): Promise<ITask | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        const dbKey = key === 'workspace_id' ? 'workspace_id' : 
                     key === 'story_id' ? 'story_id' :
                     key === 'department_id' ? 'department_id' :
                     key === 'team_id' ? 'team_id' :
                     key === 'assignee_id' ? 'assignee_id' :
                     key === 'creator_id' ? 'creator_id' :
                     key === 'start_date' ? 'start_date' :
                     key === 'end_date' ? 'end_date' :
                     key === 'estimated_hours' ? 'estimated_hours' :
                     key === 'updatedAt' ? 'updated_at' : key;
        
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
      UPDATE tasks 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Task(
      row.id,
      row.name,
      row.workspace_id,
      row.story_id,
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
      'TASK',
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Delete task
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM tasks WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find tasks by workspace
   */
  async findByWorkspace(workspace_id: string): Promise<ITask[]> {
    const query = `
      SELECT id, name, description, workspace_id, story_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM tasks
      WHERE workspace_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [workspace_id]);
    
    return result.rows.map(row => new Task(
      row.id,
      row.name,
      row.workspace_id,
      row.story_id,
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
      'TASK',
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find tasks by story
   */
  async findByStory(story_id: string): Promise<ITask[]> {
    const query = `
      SELECT id, name, description, workspace_id, story_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM tasks
      WHERE story_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [story_id]);
    
    return result.rows.map(row => new Task(
      row.id,
      row.name,
      row.workspace_id,
      row.story_id,
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
      'TASK',
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find tasks by assignee
   */
  async findByAssignee(assignee_id: string): Promise<ITask[]> {
    const query = `
      SELECT id, name, description, workspace_id, story_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM tasks
      WHERE assignee_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [assignee_id]);
    
    return result.rows.map(row => new Task(
      row.id,
      row.name,
      row.workspace_id,
      row.story_id,
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
      'TASK',
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Get tasks with pagination
   */
  async getTasksWithPagination(
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
      story_id?: string;
    }
  ): Promise<{
    tasks: ITask[];
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
      
      if (filters.story_id) {
        whereClause += ` AND story_id = $${paramIndex}`;
        params.push(filters.story_id);
        paramIndex++;
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM tasks ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get tasks with pagination
    const tasksQuery = `
      SELECT id, name, description, workspace_id, story_id, department_id, team_id, assignee_id, creator_id,
             priority, status, start_date, end_date, estimated_hours, tags, type, created_at, updated_at
      FROM tasks
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const tasksResult = await this.pool.query(tasksQuery, params);
    
    const tasks = tasksResult.rows.map(row => new Task(
      row.id,
      row.name,
      row.workspace_id,
      row.story_id,
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
      'TASK',
      row.created_at,
      row.updated_at
    ));

    return {
      tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}