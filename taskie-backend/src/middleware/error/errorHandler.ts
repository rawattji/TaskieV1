import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  const logger = new Logger('ErrorHandler');
  
  // Log the error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id']
  });
  
  // Determine the status code
  let statusCode = 500;
  let message = 'Internal Server Error';
  
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'AuthenticationError') {
    statusCode = 401;
    message = 'Authentication failed';
  } else if (err.name === 'AuthorizationError') {
    statusCode = 403;
    message = 'Authorization failed';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.headers['x-request-id'],
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}