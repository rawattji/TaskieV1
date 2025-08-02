import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Workspace } from '../entities/Workspace';
import { IWorkspace, WorkspaceRole, WorkspaceSettings } from '../../types/workspace.types';
import { v4 as uuidv4 } from 'uuid';

export class WorkspaceRepository extends BaseRepository<IWorkspace> {
  constructor(pool: Pool) {
    super(pool);
  }

  private parseSettings(settings: string | object): WorkspaceSettings {
    let parsed: any;

    if (typeof settings === 'object' && settings !== null) {
      parsed = settings;
    } else {
      try {
        parsed = JSON.parse(settings as string);
      } catch (err) {
        parsed = {};
      }
    }

    return {
      allow_external_invites: parsed.allow_external_invites ?? false,
      default_permissions: parsed.default_permissions ?? 'READ',
      timeZone: parsed.timeZone ?? 'UTC',
      working_hours: {
        start: parsed.working_hours?.start ?? '09:00',
        end: parsed.working_hours?.end ?? '17:00',
        working_days: parsed.working_hours?.working_days ?? [1, 2, 3, 4, 5]
      }
    };
  }

  async create(entity: Omit<IWorkspace, 'id' | 'created_at' | 'updated_at'>): Promise<IWorkspace> {
    const { name, domain, description, logo, is_active, settings } = entity;

    let settingsJson: string;
    if (typeof settings === 'string') {
      try {
        JSON.parse(settings);
        settingsJson = settings;
      } catch {
        settingsJson = '{}';
      }
    } else if (typeof settings === 'object' && settings !== null) {
      settingsJson = JSON.stringify(settings);
    } else {
      settingsJson = '{}';
    }

    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = new Date();

    const query = `
      INSERT INTO workspaces (id, name, domain, description, logo, is_active, settings, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      id,
      name,
      domain,
      description,
      logo,
      is_active ?? true,
      settingsJson,
      createdAt,
      updatedAt,
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    console.log('Executing:', query, values);

    return new Workspace(
      row.id,
      row.name,
      row.domain,
      row.is_active,
      this.parseSettings(row.settings),
      row.description,
      row.logo,
      row.created_at,
      row.updated_at
    );
  }
  
  async findByUserId(userId: string): Promise<IWorkspace[]> {
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
      this.parseSettings(row.settings),
      row.description,
      row.logo,
      row.created_at,
      row.updated_at
    ));
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
    console.log('Executing:', query);

    return new Workspace(
      row.id,
      row.name,
      row.domain,
      row.is_active,
      this.parseSettings(row.settings),
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
        this.parseSettings(row.settings),
        row.description,
        row.logo,
        row.created_at,
        row.updated_at
      );
    }

  async addUserToWorkspace(workspaceId: string, userId: string, role: WorkspaceRole, isActive = true): Promise<void> {
    const query = `
      INSERT INTO user_workspaces (workspace_id, user_id, role, is_active, joined_at)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [
      workspaceId,
      userId,
      role,
      isActive,
      new Date()
    ];

    await this.pool.query(query, values);
  }
  
    
  async update(id: string, updates: Partial<IWorkspace>): Promise<IWorkspace | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        const dbKey = key === 'is_active' ? 'is_active' : 
                     key === 'updated_at' ? 'updated_at' : key;
        
        if (key === 'settings') {
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
    paramIndex++;
    values.push(id);

    const query = `
      UPDATE workspaces 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
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
      this.parseSettings(row.settings),
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
      this.parseSettings(row.settings),
      row.description,
      row.logo,
      row.created_at,
      row.updated_at
    ));
  }
}
