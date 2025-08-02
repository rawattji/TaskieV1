import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth/AuthService';
import { Logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/apiResponse';
import { IUser } from '../../types/workspace.types';

// Extend Request to include user
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export class AuthMiddleware {
  private authService: AuthService;
  private logger: Logger;

  constructor(authService: AuthService, logger: Logger) {
    this.authService = authService;
    this.logger = logger;
  }

  // Middleware to require authentication
  requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        res.status(401).json(ApiResponse.error('Authentication required', 401));
        return;
      }

      const { valid, user } = await this.authService.verifyToken(token);
      
      if (!valid || !user) {
        res.status(401).json(ApiResponse.error('Invalid or expired token', 401));
        return;
      }

      // Attach user to request
      req.user = user;
      next();

    } catch (error) {
      this.logger.error('Auth middleware error:', error);
      res.status(401).json(ApiResponse.error('Authentication failed', 401));
    }
  };

  // Middleware to optionally authenticate (doesn't fail if no token)
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        const { valid, user } = await this.authService.verifyToken(token);
        
        if (valid && user) {
          req.user = user;
        }
      }

      next();

    } catch (error) {
      this.logger.error('Optional auth middleware error:', error);
      // Continue without authentication
      next();
    }
  };

  // Middleware to require verified email
  requireVerified = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json(ApiResponse.error('Authentication required', 401));
      return;
    }

    if (!req.user.is_verified) {
      res.status(403).json(ApiResponse.error('Email verification required', 403, {
        requiresVerification: true,
        email: req.user.email
      }));
      return;
    }

    next();
  };

  // Middleware to require specific role (for workspace-based auth)
  requireRole = (allowedRoles: string[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json(ApiResponse.error('Authentication required', 401));
        return;
      }

      // This would require workspace context - implement based on your needs
      // For now, just pass through
      next();
    };
  };

  // Extract token from Authorization header
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Support both "Bearer token" and "token" formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }
}

// Factory function to create middleware with dependencies
export function createAuthMiddleware(authService: AuthService, logger: Logger): AuthMiddleware {
  return new AuthMiddleware(authService, logger);
}

// Export individual middleware functions for convenience
export function requireAuth(authService: AuthService, logger: Logger) {
  const middleware = new AuthMiddleware(authService, logger);
  return middleware.requireAuth;
}

export function optionalAuth(authService: AuthService, logger: Logger) {
  const middleware = new AuthMiddleware(authService, logger);
  return middleware.optionalAuth;
}

export function requireVerified(authService: AuthService, logger: Logger) {
  const middleware = new AuthMiddleware(authService, logger);
  return middleware.requireVerified;
}