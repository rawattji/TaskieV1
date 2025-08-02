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
      SELECT id, email, username, first_name, last_name, avatar, is_active, 
             is_verified, verified_at, created_at, updated_at, password_hash
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
      row.updated_at,
      row.password_hash,
      row.is_verified,
      row.verified_at
    );
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, avatar, is_active, 
             is_verified, verified_at, created_at, updated_at, password_hash
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
      row.updated_at,
      row.password_hash,
      row.is_verified,
      row.verified_at
    );
  }

  async findByUsername(username: string): Promise<IUser | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, avatar, is_active, 
             is_verified, verified_at, created_at, updated_at, password_hash
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
      row.updated_at,
      row.password_hash,
      row.is_verified,
      row.verified_at
    );
  }

  async create(userData: Omit<IUser, 'id' | 'created_at' | 'updated_at' >): Promise<IUser> {
    const id = uuidv4();
    const now = new Date();
    
    // Validate required fields
    if (!userData.password_hash) {
      throw new Error('password_hash is required');
    }
    
    const query = `
      INSERT INTO users (id, email, username, first_name, last_name, avatar, is_active, 
                        is_verified, verified_at, created_at, updated_at, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      id,
      userData.email,
      userData.username,
      userData.first_name,
      userData.last_name,
      userData.avatar || null,
      userData.is_active ?? true, // Default to true if not provided
      userData.is_verified ?? false, // Default to false for new users
      userData.verified_at || null,
      now,
      now,
      userData.password_hash
    ];

    console.log('Creating user with values:', { 
      id,
      email: userData.email,
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      avatar: userData.avatar || null,
      is_active: userData.is_active ?? true,
      is_verified: userData.is_verified ?? false,
      password_hash: userData.password_hash ? '[PRESENT]' : '[MISSING]'
    });

    try {
      const result = await this.pool.query(query, values);
      const row = result.rows[0];
      
      console.log('User created successfully with ID:', row.id);
      
      return new User(
        row.id,
        row.email,
        row.username,
        row.first_name,
        row.last_name,
        row.is_active,
        row.avatar,
        row.created_at,
        row.updated_at,
        row.password_hash,
        row.is_verified,
        row.verified_at
      );
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Handle all possible update fields including verification fields
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        const dbKey = key === 'first_name' ? 'first_name' : 
                     key === 'last_name' ? 'last_name' :
                     key === 'is_active' ? 'is_active' : 
                     key === 'is_verified' ? 'is_verified' :
                     key === 'verified_at' ? 'verified_at' :
                     key === 'updated_at' ? 'updated_at' : 
                     key === 'password_hash' ? 'password_hash' : key;
        
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
    paramIndex++;
    values.push(id);

    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
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
      row.updated_at,
      row.password_hash,
      row.is_verified,
      row.verified_at
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

  async findWorkspaceUsers(workspace_id: string): Promise<IUser[]> {
    const query = `
      SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.avatar, u.is_active, 
             u.is_verified, u.verified_at, u.created_at, u.updated_at
      FROM users u
      INNER JOIN user_workspaces uw ON u.id = uw.user_id
      WHERE uw.workspace_id = $1 AND u.is_active = true AND uw.is_active = true
    `;
    
    const result = await this.pool.query(query, [workspace_id]);
    
    return result.rows.map(row => new User(
      row.id,
      row.email,
      row.username,
      row.first_name,
      row.last_name,
      row.is_active,
      row.avatar,
      row.created_at,
      row.updated_at,
      undefined, // Don't return password hash for workspace users
      row.is_verified,
      row.verified_at
    ));
  }

  // New method to check if user exists by email (useful for OTP)
  async checkEmailExists(email: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM users 
      WHERE email = $1 AND is_active = true
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [email]);
    return result.rows.length > 0;
  }

  // New method to mark user as verified
  async markAsVerified(email: string): Promise<IUser | null> {
    const query = `
      UPDATE users 
      SET is_verified = true, verified_at = $1, updated_at = $2
      WHERE email = $3 AND is_active = true
      RETURNING *
    `;
    
    const now = new Date();
    const result = await this.pool.query(query, [now, now, email]);
    
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
      row.updated_at,
      row.password_hash,
      row.is_verified,
      row.verified_at
    );
  }
}