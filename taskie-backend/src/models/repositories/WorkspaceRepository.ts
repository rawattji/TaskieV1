import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Workspace } from '../entities/Workspace';
import { IWorkspace } from '../../types/workspace.types';

export class WorkspaceRepository extends BaseRepository<IWorkspace> {
  constructor(pool: Pool) {
    super(pool);
  }
  
  async create(entity: Omit<IWorkspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<IWorkspace> {
  const { name, domain, description, logo, isActive, settings } = entity;

  const query = `
    INSERT INTO workspaces 
      (name, domain, description, logo, is_active, settings, created_at, updated_at)
    VALUES 
      ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *;
  `;

  const values = [
    name,
    domain,
    description,
    logo,
    isActive ?? true,
    JSON.stringify(settings || {})
  ];

  const result = await this.pool.query(query, values);
  const row = result.rows[0];

  return new Workspace(
    row.id,
    row.name,
    row.domain,
    row.is_active,
    JSON.parse(row.settings),
    row.description,
    row.logo,
    row.created_at,
    row.updated_at
  );
}

async findByDomain(domain: string): Promise<IWorkspace | null> {
  const query = `
    SELECT id, name, domain, description, logo, is_active, settings, created_at, updated_at
    FROM workspaces
    WHERE domain = $1 AND is_active = true
  `;

  const result = await this.pool.query(query, [domain]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return new Workspace(
    row.id,
    row.name,
    row.domain,
    row.is_active,
    JSON.parse(row.settings),
    row.description,
    row.logo,
    row.created_at,
    row.updated_at
  );
}


  async findById(id: string): Promise<IWorkspace | null> {
    const query = `
      SELECT id, name, domain, description, logo, is_active, settings, created_at, updated_at
      FROM workspaces 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Workspace(
      row.id,
      row.name,
      row.domain,
      row.is_active,
      JSON.parse(row.settings),
      row.description,
      row.logo,
      row.created_at,
      row.updated_at
    );
  }

  async update(id: string, updates: Partial<IWorkspace>): Promise<IWorkspace | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbKey = key === 'isActive' ? 'is_active' : 
                     key === 'updatedAt' ? 'updated_at' : key;
        
        if (key === 'settings') {
          setClause.push(`${dbKey} = ${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${dbKey} = ${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = ${paramIndex}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE workspaces 
      SET ${setClause.join(', ')}
      WHERE id = ${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new Workspace(
      row.id,
      row.name,
      row.domain,
      row.is_active,
      JSON.parse(row.settings),
      row.description,
      row.logo,
      row.created_at,
      row.updated_at
    );
  }

  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE workspaces 
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;
    
    const result = await this.pool.query(query, [new Date(), id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async findUserWorkspaces(userId: string): Promise<IWorkspace[]> {
    const query = `
      SELECT w.id, w.name, w.domain, w.description, w.logo, w.is_active, w.settings, w.created_at, w.updated_at
      FROM workspaces w
      INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
      WHERE uw.user_id = $1 AND w.is_active = true AND uw.is_active = true
    `;
    
    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map(row => new Workspace(
      row.id,
      row.name,
      row.domain,
      row.is_active,
      JSON.parse(row.settings),
      row.description,
      row.logo,
      row.created_at,
      row.updated_at
    ));
  }
}
