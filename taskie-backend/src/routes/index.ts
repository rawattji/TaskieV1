import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth/AuthController';
import { WorkspaceController } from '../controllers/workspace/WorkspaceController';
import { TeamController } from '../controllers/team/TeamController';
import { NotificationController } from '../controllers/notification/NotificationController';
import rateLimit from 'express-rate-limit';

export function createApiRoutes(
  authController: AuthController,
  workspaceController: WorkspaceController,
  teamController: TeamController,
  notificationController: NotificationController
): Router {
  const router = Router();

    // Apply rate limiting to auth routes
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const otpRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  message: 'Too many OTP requests, please wait before trying again',
  standardHeaders: true,
  legacyHeaders: false
});

  
  // Auth routes
  router.post(
    '/auth/register',
    authRateLimit,
    AuthController.registerValidation,
    authController.register
  );

  // Login route
  router.post(
    '/auth/login',
    authRateLimit,
    AuthController.loginValidation,
    authController.login
  );

  // OTP verification route
  router.post(
    '/auth/verify-otp',
    authRateLimit,
    AuthController.otpValidation,
    authController.verifyOTP
  );

  // Resend OTP route
  router.post(
    '/auth/resend-otp',
    otpRateLimit,
    AuthController.resendOTPValidation,
    authController.resendOTP
  );

  // Refresh token route
  router.post(
    '/refresh-token',
    authRateLimit,
    AuthController.refreshTokenValidation,
    authController.refreshToken
  );
  
  // Workspace routes
  router.get('/workspaces/:id', (req, res, next) => workspaceController.getWorkspace(req as any, res, next));
  router.post('/workspaces', (req, res, next) => workspaceController.createWorkspace(req as any, res, next));
  router.put('/workspaces/:id', (req, res, next) => workspaceController.updateWorkspace(req as any, res, next));
  router.delete('/workspaces/:id', (req, res, next) => workspaceController.deleteWorkspace(req as any, res, next));
  router.get('/workspaces/domain/:domain', (req, res, next) => workspaceController.getWorkspaceByDomain(req as any, res, next));
  router.get('/users/:userId/workspaces', (req, res, next) => workspaceController.getUserWorkspaces(req as any, res, next));
  router.get('/workspaces/:id/details', (req, res, next) => workspaceController.getWorkspaceDetails(req as any, res, next));
  router.get('/workspaces/:id/stats', (req, res, next) => workspaceController.getWorkspaceStats(req as any, res, next));
  
  // User workspace routes
  router.post('/workspaces/:workspace_id/users', (req, res, next) => workspaceController.addUserToWorkspace(req as any, res, next));
  router.put('/workspaces/:workspace_id/users/:userId', (req, res, next) => workspaceController.updateUserWorkspace(req as any, res, next));
  router.delete('/workspaces/:workspace_id/users/:userId', (req, res, next) => workspaceController.removeUserFromWorkspace(req as any, res, next));
  router.get('/workspaces/:workspace_id/members', (req, res, next) => workspaceController.getWorkspaceMembers(req as any, res, next));
  router.post('/workspaces/:workspace_id/users/:userId/team', (req, res, next) => workspaceController.assignUserToTeam(req as any, res, next));
  router.delete('/workspaces/:workspace_id/users/:userId/team', (req, res, next) => workspaceController.removeUserFromTeam(req as any, res, next));
  
  // Team routes
  router.post('/teams', (req, res, next) => teamController.createTeam(req as any, res, next));
  router.get('/teams/:id', (req, res, next) => teamController.getTeam(req as any, res, next));
  router.put('/teams/:id', (req, res, next) => teamController.updateTeam(req as any, res, next));
  router.delete('/teams/:id', (req, res, next) => teamController.deleteTeam(req as any, res, next));
  router.get('/teams/workspace/:workspace_id', (req, res, next) => teamController.getWorkspaceTeams(req as any, res, next));
  router.get('/teams/:id/members', (req, res, next) => teamController.getTeamMembers(req as any, res, next));
  
  // Notification routes
  router.get('/notifications', (req, res, next) => notificationController.getUserNotifications(req as any, res, next));
  router.put('/notifications/:id/read', (req, res, next) => notificationController.markAsRead(req as any, res, next));
  router.delete('/notifications/:id', (req, res, next) => notificationController.deleteNotification(req as any, res, next));
  
  return router;
}