import { Pool, PoolConfig } from 'pg';
import { Logger } from '../utils/logger';

export class DatabaseConnection {
  private pool!: Pool;
  private logger!: Logger;

  constructor() {
    this.logger = new Logger('Database');
  }

  async initialize(): Promise<void> {
    const config: PoolConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : undefined,
      connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT ? Number(process.env.DB_CONNECTION_TIMEOUT) : undefined,
      idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT ? Number(process.env.DB_IDLE_TIMEOUT) : undefined,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };


    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client:', err);
    });

    this.pool.on('connect', () => {
      this.logger.debug('New database client connected');
    });

    this.pool.on('remove', () => {
      this.logger.debug('Database client removed from pool');
    });

    this.logger.info('Database connection pool initialized');
  }

  async testConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();
      
      this.logger.info('Database connection test successful:', {
        time: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0]
      });
    } catch (error) {
      this.logger.error('Database connection test failed:', error);
      throw error;
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database connection not initialized');
    }
    return this.pool;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database connection pool closed');
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      this.logger.debug('Executed query', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      this.logger.error('Query error:', { text, params, error });
      throw error;
    }
  }
}
