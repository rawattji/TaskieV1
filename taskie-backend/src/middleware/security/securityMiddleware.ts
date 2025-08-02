import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Add request ID for tracing
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);

  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent caching of sensitive endpoints
  if (req.path.includes('/api/auth') || req.path.includes('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}
