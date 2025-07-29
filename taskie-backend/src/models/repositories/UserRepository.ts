import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository';
import { User } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';
import { IUser } from '../../types/workspace.types';

export class UserRepository extends BaseRepository<IUser> {
  constructor(pool: Pool) {
    super(pool);
  }

  async findById(id: string): Promise<IUser | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, avatar, is_active, created_at, updated_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User(
      row.id,
      row.email,
      row.username,
      row.first_name,
      row.last_name,
      row.is_active,
      row.avatar,
      row.created_at,
      row.updated_at
    );
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, avatar, is_active, created_at, updated_at
      FROM users 
      WHERE email = $1 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User(
      row.id,
      row.email,
      row.username,
      row.first_name,
      row.last_name,
      row.is_active,
      row.avatar,
      row.created_at,
      row.updated_at
    );
  }

  async findByUsername(username: string): Promise<IUser | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, avatar, is_active, created_at, updated_at
      FROM users 
      WHERE username = $1 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User(
      row.id,
      row.email,
      row.username,
      row.first_name,
      row.last_name,
      row.is_active,
      row.avatar,
      row.created_at,
      row.updated_at
    );
  }

  async create(userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO users (id, email, username, first_name, last_name, avatar, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      id,
      userData.email,
      userData.username,
      userData.firstName,
      userData.lastName,
      userData.avatar,
      userData.isActive,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return new User(
      row.id,
      row.email,
      row.username,
      row.first_name,
      row.last_name,
      row.is_active,
      row.avatar,
      row.created_at,
      row.updated_at
    );
  }

  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbKey = key === 'firstName' ? 'first_name' : 
                     key === 'lastName' ? 'last_name' :
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
      UPDATE users 
      SET ${setClause.join(', ')}
      WHERE id = ${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User(
      row.id,
      row.email,
      row.username,
      row.first_name,
      row.last_name,
      row.is_active,
      row.avatar,
      row.created_at,
      row.updated_at
    );
  }

  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;
    
    const result = await this.pool.query(query, [new Date(), id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async findWorkspaceUsers(workspaceId: string): Promise<IUser[]> {
    const query = `
      SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.avatar, u.is_active, u.created_at, u.updated_at
      FROM users u
      INNER JOIN user_workspaces uw ON u.id = uw.user_id
      WHERE uw.workspace_id = $1 AND u.is_active = true AND uw.is_active = true
    `;
    
    const result = await this.pool.query(query, [workspaceId]);
    
    return result.rows.map(row => new User(
      row.id,
      row.email,
      row.username,
      row.first_name,
      row.last_name,
      row.is_active,
      row.avatar,
      row.created_at,
      row.updated_at
    ));
  }
}
