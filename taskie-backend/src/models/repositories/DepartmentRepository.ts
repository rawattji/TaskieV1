import { Pool, PoolClient } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Department } from '../entities/Department';
import { v4 as uuidv4 } from 'uuid';
import { IDepartment } from '../../types/workspace.types';

export class DepartmentRepository extends BaseRepository<IDepartment> {
  constructor(pool: Pool) {
    super(pool);
  }

  /**
   * Find department by ID
   */
  async findById(id: string): Promise<IDepartment | null> {
    const query = `
      SELECT id, workspace_id, name, description, parent_department_id, manager_id, is_active, created_at, updated_at
      FROM departments 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Department(
      row.id,
      row.workspace_id,
      row.name,
      row.is_active,
      row.description,
      row.parent_department_id,
      row.manager_id,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Create new department
   */
  async create(departmentData: Omit<IDepartment, 'id' | 'created_at' | 'updated_at'>): Promise<IDepartment> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO departments (id, workspace_id, name, description, parent_department_id, manager_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      id,
      departmentData.workspace_id,
      departmentData.name,
      departmentData.description,
      departmentData.parent_department_id,
      departmentData.manager_id,
      departmentData.is_active,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return new Department(
      row.id,
      row.workspace_id,
      row.name,
      row.is_active,
      row.description,
      row.parent_department_id,
      row.manager_id,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Update department
   */
  async update(id: string, updates: Partial<IDepartment>): Promise<IDepartment | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        const dbKey = key === 'workspace_id' ? 'workspace_id' : 
                     key === 'parentdepartment_id' ? 'parent_department_id' :
                     key === 'manager_id' ? 'manager_id' :
                     key === 'is_active' ? 'is_active' :
                     key === 'updated_at' ? 'updated_at' : key;
        
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
      UPDATE departments 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex + 1} AND is_active = true
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Department(
      row.id,
      row.workspace_id,
      row.name,
      row.is_active,
      row.description,
      row.parent_department_id,
      row.manager_id,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * Soft delete department
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE departments 
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;
    
    const result = await this.pool.query(query, [new Date(), id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find departments by workspace
   */
  async findByWorkspace(workspace_id: string): Promise<IDepartment[]> {
    const query = `
      SELECT id, workspace_id, name, description, parent_department_id, manager_id, is_active, created_at, updated_at
      FROM departments
      WHERE workspace_id = $1 AND is_active = true
      ORDER BY name ASC
    `;
    
    const result = await this.pool.query(query, [workspace_id]);
    
    return result.rows.map(row => new Department(
      row.id,
      row.workspace_id,
      row.name,
      row.is_active,
      row.description,
      row.parent_department_id,
      row.manager_id,
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find departments by parent
   */
  async findByParent(parentdepartment_id: string): Promise<IDepartment[]> {
    const query = `
      SELECT id, workspace_id, name, description, parent_department_id, manager_id, is_active, created_at, updated_at
      FROM departments
      WHERE parent_department_id = $1 AND is_active = true
      ORDER BY name ASC
    `;
    
    const result = await this.pool.query(query, [parentdepartment_id]);
    
    return result.rows.map(row => new Department(
      row.id,
      row.workspace_id,
      row.name,
      row.is_active,
      row.description,
      row.parent_department_id,
      row.manager_id,
      row.created_at,
      row.updated_at
    ));
  }

  /**
   * Find departments by manager
   */
  async findByManager(manager_id: string): Promise<IDepartment[]> {
    const query = `
      SELECT id, workspace_id, name, description, parent_department_id, manager_id, is_active, created_at, updated_at
      FROM departments
      WHERE manager_id = $1 AND is_active = true
      ORDER BY name ASC
    `;
    
    const result = await this.pool.query(query, [manager_id]);
    
    return result.rows.map(row => new Department(
      row.id,
      row.workspace_id,
      row.name,
      row.is_active,
      row.description,
      row.parent_department_id,
      row.manager_id,
      row.created_at,
      row.updated_at
    ));
  }
}