import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Team } from '../entities/Team';
import { v4 as uuidv4 } from 'uuid';
import { ITeam } from '../../types/workspace.types';

export class TeamRepository extends BaseRepository<ITeam> {
  constructor(pool: Pool) {
    super(pool);
  }

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
        
        setClause.push(`${dbKey} = ${paramIndex}`);
        values.push(value);
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
      UPDATE teams 
      SET ${setClause.join(', ')}
      WHERE id = ${paramIndex + 1}
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

  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE teams 
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;
    
    const result = await this.pool.query(query, [new Date(), id]);
    return result.rowCount > 0;
  }

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
}.id,
      row.name,
      row.domain,
      row.is_active,
      row.settings,
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
      row.settings,
      row.description,
      row.logo,
      row.created_at,
      row.updated_at
    );
  }

  async create(workspaceData: Omit<IWorkspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<IWorkspace> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO workspaces (id, name, domain, description, logo, is_active, settings, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      id,
      workspaceData.name,
      workspaceData.domain,
      workspaceData.description,
      workspaceData.logo,
      workspaceData.isActive,
      JSON.stringify(workspaceData.settings),
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return new Workspace(
      row
