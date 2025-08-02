// src/controllers/NotificationController.ts

import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../../services/notification/NotificationService';
import { AuthenticatedRequest } from '../../types/auth.types';
import { Logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/apiResponse';
import { param, validationResult } from 'express-validator';

export class NotificationController {
  private notificationService: NotificationService;
  private logger: Logger;

  constructor(notificationService: NotificationService, logger: Logger) {
    this.notificationService = notificationService;
    this.logger = logger;
  }

  getUserNotifications = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(ApiResponse.error('Validation failed', 400, errors.array()));
        return;
      }

      const userId = req.user!.id;
      const { page = '1', limit = '20', unreadOnly = 'false' } = req.query as Record<string, string>;

      const result = await this.notificationService.getUserNotifications(userId, undefined, {
        page: parseInt(page),
        limit: parseInt(limit),
        unreadOnly: unreadOnly === 'true'
      });

      res.json(ApiResponse.success(result, 'Notifications retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(ApiResponse.error('Validation failed', 400, errors.array()));
        return;
      }

      const { id } = req.params;
      const userId = req.user!.id;

      const success = await this.notificationService.markAsRead(id, userId);

      if (!success) {
        res.status(404).json(ApiResponse.error('Notification not found', 404));
        return;
      }

      res.json(ApiResponse.success(null, 'Notification marked as read'));
    } catch (error) {
      next(error);
    }
  };

  deleteNotification = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(ApiResponse.error('Validation failed', 400, errors.array()));
        return;
      }

      const { id } = req.params;
      const userId = req.user!.id;

      const success = await this.notificationService.deleteNotification(id, userId);

      if (!success) {
        res.status(404).json(ApiResponse.error('Notification not found', 404));
        return;
      }

      res.json(ApiResponse.success(null, 'Notification deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  static validateNotificationId = [
    param('id')
      .isUUID()
      .withMessage('Invalid notification ID')
  ];
}
