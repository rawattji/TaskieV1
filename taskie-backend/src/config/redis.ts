import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils/logger';

export class RedisConnection {
  private client!: RedisClientType;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('Redis');
  }

  async initialize(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            this.logger.error('Redis reconnection failed after 10 attempts');
            return false;
          }
          const delay = Math.min(retries * 50, 500);
          this.logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        }
      }
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error:', err);
    });

    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.info('Redis client ready');
    });

    this.client.on('end', () => {
      this.logger.info('Redis client disconnected');
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis client reconnecting...');
    });

    await this.client.connect();
    this.logger.info('Redis connection initialized');
  }

  async testConnection(): Promise<void> {
    try {
      const result = await this.client.ping();
      if (result === 'PONG') {
        this.logger.info('Redis connection test successful');
      } else {
        throw new Error('Redis ping failed');
      }
    } catch (error) {
      this.logger.error('Redis connection test failed:', error);
      throw error;
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis connection not initialized');
    }
    return this.client;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.info('Redis connection closed');
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error('Redis GET error:', { key, error });
      throw error;
    }
  }

  async set(key: string, value: string, options?: { EX?: number; PX?: number }): Promise<void> {
    try {
      await this.client.set(key, value, options);
    } catch (error) {
      this.logger.error('Redis SET error:', { key, error });
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      this.logger.error('Redis DEL error:', { key, error });
      throw error;
    }
  }

  async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      this.logger.error('Redis EXISTS error:', { key, error });
      throw error;
    }
  }
}