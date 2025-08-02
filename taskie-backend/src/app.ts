import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createApiRoutes } from './routes';
import { errorHandler } from './middleware/error/errorHandler';
import { notFoundHandler } from './middleware/error/notFoundHandler';
import { Logger } from './utils/logger';
import { corsMiddleware } from './middleware/security/corsMiddleware';
import { securityMiddleware } from './middleware/security/securityMiddleware';
import { Container } from './config/container';

export function createApp(container: Container): Application {
  const app = express();
  const logger = container.get<Logger>('Logger');
  
  // Trust proxy (important for rate limiting and getting real IP addresses)
  app.set('trust proxy', 1);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  
  // CORS configuration
  app.use(corsMiddleware);
  
  // Compression middleware
  app.use(compression());
  
  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  
  // Logging middleware
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    }
  }));
  
  // Additional security middleware
  app.use(securityMiddleware);
  
  // Health check endpoint (before API routes)
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    });
  });
  
  // API routes
  app.use('/api', createApiRoutes(
    container.get('AuthController'),
    container.get('WorkspaceController'),
    container.get('TeamController'),
    container.get('NotificationController')
  ));
  
  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('public'));
    
    // Catch all handler for SPA
    app.get('*', (req: Request, res: Response) => {
      res.sendFile('index.html', { root: 'public' });
    });
  }
  
  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  logger.info('Express application configured successfully');
  return app;
}