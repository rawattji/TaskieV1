import { createServer } from 'http';
import { createApp } from './app';
import { Container } from './config/container';
import { Logger } from './utils/logger';
import { DatabaseConnection } from './database/connection';
import { RedisConnection } from './config/redis';
import { WebSocketService } from './services/notification/WebSocketService';
import { AuthService } from './services/auth/AuthService';
import { EmailService } from './services/notification/EmailService';
import dotenv from 'dotenv';
dotenv.config();

async function bootstrap(): Promise<void> {
  try {
    const container = new Container();
    await container.initialize();
    const logger = container.get<Logger>('Logger');
    const databaseConnection = container.get<DatabaseConnection>('DatabaseConnection');
    const redisConnection = container.get<RedisConnection>('RedisConnection');
    
    // Test database connection
    await databaseConnection.testConnection();
    logger.info('Database connection established');
    
    // Test Redis connection
    await redisConnection.testConnection();
    logger.info('Redis connection established');
    
    // Create Express app
    const app = createApp(container);
    
    // Create HTTP server
    const server = createServer(app);
    
    // Initialize WebSocket service
    const authService = container.get<AuthService>('AuthService');
    const webSocketService = new WebSocketService(server, authService, logger);
    
    // Register WebSocket service in container for other services to use
    container.register('WebSocketService', webSocketService);
    
    const port = process.env.PORT;
    
    // Start server
    server.listen(port, async () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 CORS Origin: ${process.env.CORS_ORIGIN}`);
      logger.info(`💾 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
      logger.info(`🔴 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    });
        
    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await databaseConnection.close();
          logger.info('Database connection closed');
          await redisConnection.close();
          logger.info('Redis connection closed');
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
bootstrap();