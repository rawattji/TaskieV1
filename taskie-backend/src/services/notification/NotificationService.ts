// src/services/notification/NotificationService.ts
import { Pool } from 'pg';
import { EmailService } from './EmailService';
import { RedisClientType } from 'redis';
import { Logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { IUser, IWorkspace } from '../../types/workspace.types';
import { User } from '../../models/entities/User';
import { Team } from '../../models/entities/Team';
import { UserRepository } from '../../models/repositories/UserRepository';

export enum NotificationType {
  WORKSPACE_CREATED = 'WORKSPACE_CREATED',
  WORKSPACE_DELETED = 'WORKSPACE_DELETED',
  WORKSPACE_UPDATED = 'WORKSPACE_UPDATED',
  USER_ADDED_TO_WORKSPACE = 'USER_ADDED_TO_WORKSPACE',
  USER_REMOVED_FROM_WORKSPACE = 'USER_REMOVED_FROM_WORKSPACE',
  USER_ROLE_UPDATED = 'USER_ROLE_UPDATED',
  TEAM_CREATED = 'TEAM_CREATED',
  TEAM_UPDATED = 'TEAM_UPDATED',
  TEAM_DELETED = 'TEAM_DELETED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  MENTION = 'MENTION',
  DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
  PROJECT_MILESTONE = 'PROJECT_MILESTONE'
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  WEBSOCKET = 'WEBSOCKET',
  IN_APP = 'IN_APP',
  PUSH = 'PUSH'
}

export interface INotification {
  id: string;
  userId: string;
  workspace_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  isRead: boolean;
  created_at: Date;
  readAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  workspace_id: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  channels: {
    [key in NotificationType]?: NotificationChannel[];
  };
}

export class NotificationService {
  private pool: Pool;
  private emailService: EmailService;
  private redisClient: RedisClientType;
  private logger: Logger;
  private userRepository: UserRepository;

  constructor(
    pool: Pool,
    emailService: EmailService,
    redisClient: RedisClientType,
    userRepository: UserRepository,
    logger: Logger
    
  ) {
    this.pool = pool;
    this.emailService = emailService;
    this.redisClient = redisClient;
    this.userRepository = userRepository;
    this.logger = logger;
  }

  /**
   * Send workspace created notification
   */
  async sendWorkspaceCreatedNotification(workspace: IWorkspace, owner: IUser): Promise<void> {
    try {
      const notification: Omit<INotification, 'id' | 'created_at' | 'isRead'> = {
        userId: owner.id,
        workspace_id: workspace.id,
        type: NotificationType.WORKSPACE_CREATED,
        title: 'Workspace Created Successfully',
        message: `Your workspace "${workspace.name}" has been created successfully.`,
        data: {
          workspace_id: workspace.id,
          workspaceName: workspace.name,
          domain: workspace.domain
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP]
      };

      await this.createAndSendNotification(notification);

      this.logger.info(`Workspace created notification sent to user ${owner.id}`);
    } catch (error) {
      this.logger.error('Error sending workspace created notification:', error);
    }
  }

  /**
   * Send workspace deleted notification
   */
  async sendWorkspaceDeletedNotification(workspace_id: string, members: IUser[]): Promise<void> {
    try {
      const notifications = members.map(member => ({
        userId: member.id,
        workspace_id,
        type: NotificationType.WORKSPACE_DELETED,
        title: 'Workspace Deleted',
        message: 'A workspace you were a member of has been deleted.',
        data: {
          workspace_id
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP]
      }));

      await Promise.all(
        notifications.map(notification => this.createAndSendNotification(notification))
      );

      this.logger.info(`Workspace deleted notifications sent to ${members.length} members`);
    } catch (error) {
      this.logger.error('Error sending workspace deleted notifications:', error);
    }
  }

  /**
   * Send user added to workspace notification
   */
  async sendUserAddedToWorkspaceNotification(
    workspace: IWorkspace,
    user: User,
    addedBy: User,
    role: string
  ): Promise<void> {
    try {
      const notification: Omit<INotification, 'id' | 'created_at' | 'isRead'> = {
        userId: user.id,
        workspace_id: workspace.id,
        type: NotificationType.USER_ADDED_TO_WORKSPACE,
        title: 'Added to Workspace',
        message: `You have been added to workspace "${workspace.name}" as ${role} by ${addedBy.fullName}.`,
        data: {
          workspace_id: workspace.id,
          workspaceName: workspace.name,
          role,
          addedBy: {
            id: addedBy.id,
            name: addedBy.fullName
          }
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET]
      };

      await this.createAndSendNotification(notification);

      this.logger.info(`User added to workspace notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Error sending user added to workspace notification:', error);
    }
  }

  /**
   * Send user removed from workspace notification
   */
  async sendUserRemovedFromWorkspaceNotification(
    workspace: IWorkspace,
    user: User,
    removedBy: User
  ): Promise<void> {
    try {
      const notification: Omit<INotification, 'id' | 'created_at' | 'isRead'> = {
      userId: user.id,
        workspace_id: workspace.id,
        type: NotificationType.USER_REMOVED_FROM_WORKSPACE,
        title: 'Removed from Workspace',
        message: `You have been removed from workspace "${workspace.name}" by ${removedBy.fullName}.`,
        data: {
          workspace_id: workspace.id,
          workspaceName: workspace.name,
          removedBy: {
            id: removedBy.id,
            name: removedBy.fullName
          }
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP]
      };

      await this.createAndSendNotification(notification);

      this.logger.info(`User removed from workspace notification sent to user ${user.id}`);
    } catch (error) {
      this.logger.error('Error sending user removed from workspace notification:', error);
    }
  }

  /**
   * Send team created notification
   */
  async sendTeamCreatedNotification(
    team: Team,
    workspace: IWorkspace,
    creator: User,
    members: User[]
  ): Promise<void> {
    try {
      const notifications = members.map(member => ({
        userId: member.id,
        workspace_id: workspace.id,
        type: NotificationType.TEAM_CREATED,
        title: 'New Team Created',
        message: `Team "${team.name}" has been created in workspace "${workspace.name}" by ${creator.fullName}.`,
        data: {
          team_id: team.id,
          teamName: team.name,
          workspace_id: workspace.id,
          workspaceName: workspace.name,
          createdBy: {
            id: creator.id,
            name: creator.fullName
          }
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET]
      }));

      await Promise.all(
        notifications.map(notification => this.createAndSendNotification(notification))
      );

      this.logger.info(`Team created notifications sent to ${members.length} members`);
    } catch (error) {
      this.logger.error('Error sending team created notifications:', error);
    }
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignedNotification(
    taskId: string,
    taskTitle: string,
    assignee: User,
    assigner: User,
    workspace: IWorkspace,
    dueDate?: Date
  ): Promise<void> {
    try {
      const dueDateText = dueDate ? ` Due: ${dueDate.toLocaleDateString()}` : '';
      
      const notification: Omit<INotification, 'id' | 'created_at' | 'isRead'> = {
        userId: assignee.id,
        workspace_id: workspace.id,
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assigned',
        message: `You have been assigned task "${taskTitle}" by ${assigner.fullName}.${dueDateText}`,
        data: {
          taskId,
          taskTitle,
          workspace_id: workspace.id,
          workspaceName: workspace.name,
          assignedBy: {
            id: assigner.id,
            name: assigner.fullName
          },
          dueDate: dueDate?.toISOString()
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET]
      };

      await this.createAndSendNotification(notification);

      this.logger.info(`Task assigned notification sent to user ${assignee.id}`);
    } catch (error) {
      this.logger.error('Error sending task assigned notification:', error);
    }
  }

  /**
   * Send deadline approaching notification
   */
  async sendDeadlineApproachingNotification(
    taskId: string,
    taskTitle: string,
    assignee: IUser,
    workspace: IWorkspace,
    dueDate: Date,
    hoursRemaining: number
  ): Promise<void> {
    try {
      const notification: Omit<INotification, 'id' | 'created_at' | 'isRead'> = {
        userId: assignee.id,
        workspace_id: workspace.id,
        type: NotificationType.DEADLINE_APPROACHING,
        title: 'Deadline Approaching',
        message: `Task "${taskTitle}" is due in ${hoursRemaining} hours (${dueDate.toLocaleString()}).`,
        data: {
          taskId,
          taskTitle,
          workspace_id: workspace.id,
          workspaceName: workspace.name,
          dueDate: dueDate.toISOString(),
          hoursRemaining
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH]
      };

      await this.createAndSendNotification(notification);

      this.logger.info(`Deadline approaching notification sent to user ${assignee.id}`);
    } catch (error) {
      this.logger.error('Error sending deadline approaching notification:', error);
    }
  }

  /**
   * Create and send notification through appropriate channels
   */
  private async createAndSendNotification(
    notificationData: Omit<INotification, 'id' | 'created_at' | 'isRead'>
  ): Promise<INotification> {
    try {
      // Get user notification preferences
      const preferences = await this.getUserNotificationPreferences(
        notificationData.userId,
        notificationData.workspace_id
      );

      // Filter channels based on user preferences
      const enabledChannels = this.filterChannelsByPreferences(
        notificationData.channels,
        notificationData.type,
        preferences
      );

      if (enabledChannels.length === 0) {
        this.logger.info(`No enabled channels for notification type ${notificationData.type} for user ${notificationData.userId}`);
        return this.createNotification({ ...notificationData, channels: [] });
      }

      // Create notification in database
      const notification = await this.createNotification({
        ...notificationData,
        channels: enabledChannels
      });

      // Cache notification in Redis
      await this.cacheNotification(notification);

      // Update unread count in Redis
      await this.updateUnreadCount(notification.userId, notification.workspace_id, 1);

      // Send through each enabled channel
      await Promise.all([
        enabledChannels.includes(NotificationChannel.EMAIL) && this.sendEmailNotification(notification),
        enabledChannels.includes(NotificationChannel.PUSH) && this.sendPushNotification(notification)
      ].filter(Boolean));

      return notification;
    } catch (error) {
      this.logger.error('Error creating and sending notification:', error);
      throw error;
    }
  }

  /**
   * Create notification in database
   */
  private async createNotification(
    notificationData: Omit<INotification, 'id' | 'created_at' | 'isRead'>
  ): Promise<INotification> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO notifications (id, user_id, workspace_id, type, title, message, data, channels, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      notificationData.userId,
      notificationData.workspace_id,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      JSON.stringify(notificationData.data || {}),
      JSON.stringify(notificationData.channels),
      false,
      now
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      workspace_id: row.workspace_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: JSON.parse(row.data),
      channels: JSON.parse(row.channels),
      isRead: row.is_read,
      created_at: row.created_at,
      readAt: row.read_at
    };
  }

  /**
   * Cache notification in Redis
   */
  private async cacheNotification(notification: INotification): Promise<void> {
    try {
      const key = `notification:${notification.id}`;
      const value = JSON.stringify(notification);
      // Cache for 24 hours
      await this.redisClient.setEx(key, 24 * 60 * 60, value);
      
      // Add to user's notification list in Redis
      const userNotificationsKey = `user_notifications:${notification.userId}:${notification.workspace_id}`;
      await this.redisClient.lPush(userNotificationsKey, notification.id);
      // Keep only the latest 100 notifications per user per workspace
      await this.redisClient.lTrim(userNotificationsKey, 0, 99);
      // Set expiration for the list (30 days)
      await this.redisClient.expire(userNotificationsKey, 30 * 24 * 60 * 60);
    } catch (error) {
      this.logger.error('Error caching notification in Redis:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: INotification): Promise<void> {
    try {
      // Fetch user email using userId
      const user = await this.userRepository.findById(notification.userId);
      if (!user || !user.email) {
        this.logger.warn(`No email found for user ${notification.userId}`);
        return;
      }
      await this.emailService.sendNotificationEmail(
        user.email,
        notification.title,
        notification.message,
        this.mapNotificationTypeToSeverity(notification.type)
      );
    } catch (error) {
      this.logger.error('Error sending email notification:', error);
    }
  }

  private mapNotificationTypeToSeverity(type: NotificationType): 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' {
    switch (type) {
      case NotificationType.TASK_COMPLETED:
      case NotificationType.TEAM_CREATED:
      case NotificationType.WORKSPACE_CREATED:
        return 'SUCCESS';
      case NotificationType.DEADLINE_APPROACHING:
        return 'WARNING';
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_UPDATED:
      case NotificationType.USER_ADDED_TO_WORKSPACE:
      case NotificationType.USER_REMOVED_FROM_WORKSPACE:
        return 'INFO';
      case NotificationType.WORKSPACE_DELETED:
        return 'ERROR';
      default:
        return 'INFO';
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: INotification): Promise<void> {
    try {
      // TODO: Implement push notification service
      this.logger.info(`Push notification would be sent: ${notification.title}`);
    } catch (error) {
      this.logger.error('Error sending push notification:', error);
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(
    userId: string,
    workspace_id: string
  ): Promise<NotificationPreferences> {
    try {
      // Try to get from Redis cache first
      const cacheKey = `notification_preferences:${userId}:${workspace_id}`;
      const cachedPreferences = await this.redisClient.get(cacheKey);
      
      if (cachedPreferences) {
        try {
          return JSON.parse(cachedPreferences);
        } catch (error) {
          this.logger.error('Error parsing cached notification preferences:', error);
        }
      }

      // Not in cache, get from database
      const query = `
        SELECT user_id, workspace_id, email_enabled, push_enabled, in_app_enabled, channels
        FROM notification_preferences
        WHERE user_id = $1 AND workspace_id = $2
      `;

      const result = await this.pool.query(query, [userId, workspace_id]);

      let preferences: NotificationPreferences;
      
      if (result.rows.length === 0) {
        // Return default preferences
        preferences = {
          userId,
          workspace_id,
          emailEnabled: true,
          pushEnabled: true,
          inAppEnabled: true,
          channels: {}
        };
      } else {
        const row = result.rows[0];
        preferences = {
          userId: row.user_id,
          workspace_id: row.workspace_id,
          emailEnabled: row.email_enabled,
          pushEnabled: row.push_enabled,
          inAppEnabled: row.in_app_enabled,
          channels: JSON.parse(row.channels || '{}')
        };
      }

      // Cache the preferences
      await this.redisClient.setEx(cacheKey, 24 * 60 * 60, JSON.stringify(preferences));
      
      return preferences;
    } catch (error) {
      this.logger.error('Error getting notification preferences:', error);
      // Return default preferences on error
      return {
        userId,
        workspace_id,
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        channels: {}
      };
    }
  }

  /**
   * Filter channels based on user preferences
   */
  private filterChannelsByPreferences(
    channels: NotificationChannel[],
    type: NotificationType,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    const filteredChannels: NotificationChannel[] = [];

    channels.forEach(channel => {
      // Check if channel is enabled globally
      const isChannelEnabled = 
        (channel === NotificationChannel.EMAIL && preferences.emailEnabled) ||
        (channel === NotificationChannel.PUSH && preferences.pushEnabled) ||
        (channel === NotificationChannel.IN_APP && preferences.inAppEnabled) ||
        (channel === NotificationChannel.WEBSOCKET && preferences.inAppEnabled);

      if (!isChannelEnabled) {
        return;
      }

      // Check if channel is enabled for this specific notification type
      const typeChannels = preferences.channels[type];
      if (typeChannels && !typeChannels.includes(channel)) {
        return;
      }

      filteredChannels.push(channel);
    });

    return filteredChannels;
  }

  /**
   * Update unread count in Redis
   */
  private async updateUnreadCount(
    userId: string,
    workspace_id?: string,
    increment?: number
  ): Promise<void> {
    try {
      const userKey = `unread_count:${userId}`;

      if (increment !== undefined) {
        await this.redisClient.incrBy(userKey, increment);

        if (workspace_id) {
          const workspaceKey = `unread_count:${userId}:${workspace_id}`;
          await this.redisClient.incrBy(workspaceKey, increment);
        }
      } else {
        const overallUnreadQuery = `
          SELECT COUNT(*) as count
          FROM notifications
          WHERE user_id = $1 AND is_read = false
        `;
        const overallResult = await this.pool.query(overallUnreadQuery, [userId]);
        const overallCount = parseInt(overallResult.rows[0].count);
        await this.redisClient.set(userKey, overallCount.toString());

        if (workspace_id) {
          const workspaceUnreadQuery = `
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = $1 AND workspace_id = $2 AND is_read = false
          `;
          const workspaceResult = await this.pool.query(workspaceUnreadQuery, [userId, workspace_id]);
          const workspaceCount = parseInt(workspaceResult.rows[0].count);

          const workspaceKey = `unread_count:${userId}:${workspace_id}`;
          await this.redisClient.set(workspaceKey, workspaceCount.toString());
        }
      }
    } catch (error) {
      this.logger.error('Error updating unread count in Redis:', error);
    }
  }

  /**
   * Get unread count from Redis
   */
  private async getUnreadCount(userId: string, workspace_id?: string): Promise<number> {
    try {
      const userKey = `unread_count:${userId}`;
      const workspaceKey = workspace_id ? `unread_count:${userId}:${workspace_id}` : null;

      let count: number | null = null;

      if (workspaceKey) {
        const workspaceCount = await this.redisClient.get(workspaceKey);
        if (workspaceCount !== null) {
          count = parseInt(workspaceCount);
        }
      }

      if (count === null) {
        const userCount = await this.redisClient.get(userKey);
        if (userCount !== null) {
          count = parseInt(userCount);
        }
      }

      if (count === null) {
        // Not in cache, recalculate
        await this.updateUnreadCount(userId, workspace_id);
        // Now try again
        if (workspaceKey) {
          const workspaceCount = await this.redisClient.get(workspaceKey);
          if (workspaceCount !== null) {
            count = parseInt(workspaceCount);
          }
        }

        if (count === null) {
          const userCount = await this.redisClient.get(userKey);
          if (userCount !== null) {
            count = parseInt(userCount);
          }
        }
      }

      return count || 0;
    } catch (error) {
      this.logger.error('Error getting unread count from Redis:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      // Check if notification exists and is unread
      const notification = await this.getNotificationById(notificationId, userId);
      if (!notification || notification.isRead) {
        return false;
      }

      const query = `
        UPDATE notifications
        SET is_read = true, read_at = $1
        WHERE id = $2 AND user_id = $3
      `;

      const result = await this.pool.query(query, [new Date(), notificationId, userId]);
      
      if (result.rowCount && result.rowCount > 0) {
        // Update Redis cache
        await this.redisClient.del(`notification:${notificationId}`);
        await this.updateUnreadCount(userId, notification.workspace_id, -1);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Get notification by ID
   */
  private async getNotificationById(notificationId: string, userId: string): Promise<INotification | null> {
    try {
      // Try to get from Redis cache first
      const key = `notification:${notificationId}`;
      const cachedNotification = await this.redisClient.get(key);
      
      if (cachedNotification) {
        try {
          return JSON.parse(cachedNotification);
        } catch (error) {
          this.logger.error('Error parsing cached notification:', error);
        }
      }

      // Not in cache, get from database
      const query = `
        SELECT id, user_id, workspace_id, type, title, message, data, channels, is_read, created_at, read_at
        FROM notifications
        WHERE id = $1 AND user_id = $2
      `;

      const result = await this.pool.query(query, [notificationId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const notification: INotification = {
        id: row.id,
        userId: row.user_id,
        workspace_id: row.workspace_id,
        type: row.type,
        title: row.title,
        message: row.message,
        data: JSON.parse(row.data),
        channels: JSON.parse(row.channels),
        isRead: row.is_read,
        created_at: row.created_at,
        readAt: row.read_at
      };

      // Cache the notification
      await this.cacheNotification(notification);
      
      return notification;
    } catch (error) {
      this.logger.error('Error getting notification by ID:', error);
      return null;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string, workspace_id?: string): Promise<number> {
    try {
      let query = `
        UPDATE notifications
        SET is_read = true, read_at = $1
        WHERE user_id = $2 AND is_read = false
      `;
      
      const values = [new Date(), userId];

      if (workspace_id) {
        query += ' AND workspace_id = $3';
        values.push(workspace_id);
      }

      const result = await this.pool.query(query, values);
      const count = result.rowCount ?? 0;
      
      if (count > 0) {
        // Update unread count in Redis
        await this.updateUnreadCount(userId, workspace_id, -count);
      }
      
      return count;
    } catch (error) {
      this.logger.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      // Get notification details before deletion
      const notification = await this.getNotificationById(notificationId, userId);
      if (!notification) {
        return false;
      }

      const query = `
        DELETE FROM notifications
        WHERE id = $1 AND user_id = $2
      `;
      const result = await this.pool.query(query, [notificationId, userId]);
      
      if (result.rowCount && result.rowCount > 0) {
        // Remove from Redis cache
        await this.redisClient.del(`notification:${notificationId}`);
        
        // Update unread count if it was unread
        if (!notification.isRead) {
          await this.updateUnreadCount(userId, notification.workspace_id, -1);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    workspace_id?: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
    } = {}
  ): Promise<{
    notifications: INotification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const { page = 1, limit = 50, unreadOnly = false, types } = options;
      const offset = (page - 1) * limit;

      let whereConditions = ['user_id = $1'];
      let values: any[] = [userId];
      let paramIndex = 2;

      if (workspace_id) {
        whereConditions.push(`workspace_id = ${paramIndex}`);
        values.push(workspace_id);
        paramIndex++;
      }

      if (unreadOnly) {
        whereConditions.push('is_read = false');
      }

      if (types && types.length > 0) {
        whereConditions.push(`type = ANY(${paramIndex})`);
        values.push(types);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Try to get notifications from Redis first
      const redisNotifications = await this.getUserNotificationsFromRedis(userId, workspace_id, limit, offset);
      
      if (redisNotifications.notifications.length > 0) {
        // Get unread count from Redis
        const unreadCount = await this.getUnreadCount(userId, workspace_id);
        
        return {
          notifications: redisNotifications.notifications,
          total: redisNotifications.total,
          unreadCount
        };
      }

      // Not in Redis, get from database
      const notificationsQuery = `
        SELECT id, user_id, workspace_id, type, title, message, data, channels, is_read, created_at, read_at
        FROM notifications
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
      `;

      values.push(limit, offset);

      const notificationsResult = await this.pool.query(notificationsQuery, values);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM notifications
        WHERE ${whereClause}
      `;

      const countResult = await this.pool.query(countQuery, values.slice(0, -2));

      const notifications: INotification[] = notificationsResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        workspace_id: row.workspace_id,
        type: row.type,
        title: row.title,
        message: row.message,
        data: JSON.parse(row.data),
        channels: JSON.parse(row.channels),
        isRead: row.is_read,
        created_at: row.created_at,
        readAt: row.read_at
      }));

      // Get unread count from Redis
      const unreadCount = await this.getUnreadCount(userId, workspace_id);

      return {
        notifications,
        total: parseInt(countResult.rows[0].total),
        unreadCount
      };
    } catch (error) {
      this.logger.error('Error getting user notifications:', error);
      return {
        notifications: [],
        total: 0,
        unreadCount: 0
      };
    }
  }

  /**
   * Get user notifications from Redis
   */
  private async getUserNotificationsFromRedis(
    userId: string,
    workspace_id?: string,
    limit?: number,
    offset?: number
  ): Promise<{
    notifications: INotification[];
    total: number;
  }> {
    try {
      const key = workspace_id 
        ? `user_notifications:${userId}:${workspace_id}`
        : `user_notifications:${userId}:*`;
      
      if (workspace_id) {
        // Get notification IDs for this user and workspace
        const notificationIds = await this.redisClient.lRange(key, offset || 0, (offset || 0) + (limit || 50) - 1);
        
        if (notificationIds.length === 0) {
          return { notifications: [], total: 0 };
        }
        
        // Get each notification
        const notifications: INotification[] = [];
        for (const id of notificationIds) {
          const notification = await this.getCachedNotification(id);
          if (notification) {
            notifications.push(notification);
          }
        }
        
        // Get total count
        const total = await this.redisClient.lLen(key);
        
        return { notifications, total };
      } else {
        // For all workspaces, we need to get all keys matching the pattern
        const keys = await this.redisClient.keys(key);
        
        if (keys.length === 0) {
          return { notifications: [], total: 0 };
        }
        
        // Get notification IDs from all workspace lists
        const allNotificationIds: string[] = [];
        for (const k of keys) {
          const ids = await this.redisClient.lRange(k, 0, -1);
          allNotificationIds.push(...ids);
        }
        
        // Remove duplicates and paginate
        const uniqueIds = [...new Set(allNotificationIds)];
        const paginatedIds = uniqueIds.slice(offset || 0, (offset || 0) + (limit || 50));
        
        // Get each notification
        const notifications: INotification[] = [];
        for (const id of paginatedIds) {
          const notification = await this.getCachedNotification(id);
          if (notification) {
            notifications.push(notification);
          }
        }
        
        return { notifications, total: uniqueIds.length };
      }
    } catch (error) {
      this.logger.error('Error getting user notifications from Redis:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Get cached notification from Redis
   */
  private async getCachedNotification(notificationId: string): Promise<INotification | null> {
    try {
      const key = `notification:${notificationId}`;
      const value = await this.redisClient.get(key);
      if (!value) {
        return null;
      }
      try {
        return JSON.parse(value);
      } catch (error) {
        this.logger.error(`Error parsing cached notification ${notificationId}:`, error);
        return null;
      }
    } catch (error) {
      this.logger.error('Error getting cached notification:', error);
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    workspace_id: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const query = `
        INSERT INTO notification_preferences (user_id, workspace_id, email_enabled, push_enabled, in_app_enabled, channels)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, workspace_id)
        DO UPDATE SET
          email_enabled = COALESCE($3, notification_preferences.email_enabled),
          push_enabled = COALESCE($4, notification_preferences.push_enabled),
          in_app_enabled = COALESCE($5, notification_preferences.in_app_enabled),
          channels = COALESCE($6, notification_preferences.channels),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const values = [
        userId,
        workspace_id,
        preferences.emailEnabled,
        preferences.pushEnabled,
        preferences.inAppEnabled,
        JSON.stringify(preferences.channels || {})
      ];

      const result = await this.pool.query(query, values);
      const row = result.rows[0];

      const updatedPreferences: NotificationPreferences = {
        userId: row.user_id,
        workspace_id: row.workspace_id,
        emailEnabled: row.email_enabled,
        pushEnabled: row.push_enabled,
        inAppEnabled: row.in_app_enabled,
        channels: JSON.parse(row.channels)
      };

      // Update Redis cache
      const cacheKey = `notification_preferences:${userId}:${workspace_id}`;
      await this.redisClient.setEx(cacheKey, 24 * 60 * 60, JSON.stringify(updatedPreferences));
      
      return updatedPreferences;
    } catch (error) {
      this.logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const query = `
        DELETE FROM notifications
        WHERE created_at < $1 AND is_read = true
        RETURNING id, user_id, workspace_id
      `;

      const result = await this.pool.query(query, [cutoffDate]);
      const deletedCount = result.rowCount ?? 0;
      
      if (deletedCount > 0) {
        // Remove from Redis cache
        for (const row of result.rows) {
          await this.redisClient.del(`notification:${row.id}`);
          
          // Remove from user's notification list
          const userNotificationsKey = `user_notifications:${row.user_id}:${row.workspace_id}`;
          await this.redisClient.lRem(userNotificationsKey, 0, row.id);
        }
        
        // Recalculate unread counts for affected users
        const affectedUsers = [...new Set(result.rows.map(row => row.user_id))];
        for (const userId of affectedUsers) {
          await this.updateUnreadCount(userId);
        }
      }
      
      this.logger.info(`Deleted ${deletedCount} old notifications`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error('Error deleting old notifications:', error);
      return 0;
    }
  }

  /**
   * Send bulk notifications (for system-wide announcements)
   */
  async sendBulkNotification(
    userIds: string[],
    workspace_id: string,
    notification: {
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, any>;
      channels: NotificationChannel[];
    }
  ): Promise<void> {
    try {
      const notifications = userIds.map(userId => ({
        ...notification,
        userId,
        workspace_id
      }));

      await Promise.all(
        notifications.map(notificationData =>
          this.createAndSendNotification(notificationData)
        )
      );

      this.logger.info(`Bulk notification sent to ${userIds.length} users`);
    } catch (error) {
      this.logger.error('Error sending bulk notification:', error);
      throw error;
    }
  }
}