import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { AuthService } from '../auth/AuthService';
import { Logger } from '../../utils/logger';
import { AuthenticatedSocket } from '../../types/websocket.types';

export class WebSocketService {
  private io: SocketIOServer;
  private logger: Logger;
  private authService: AuthService;
  private JWT_SECRET: string;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private userRooms: Map<string, string[]> = new Map(); // userId -> roomIds

  constructor(
    server: HTTPServer,
    authService: AuthService,
    logger: Logger
  ) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5713'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.authService = authService;
    this.logger = logger;
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    this.setupAuthentication();
    this.setupEventHandlers();
  }

  private setupAuthentication(): void {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      try {
        const decoded = this.authService.verifyToken(token);
        socket.data.user = decoded;
        next();
      } catch (err) {
        this.logger.error('WebSocket authentication error:', err);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.data.user.id;
      
      this.logger.info(`User connected: ${userId}`);
      
      // Track connected user
      this.connectedUsers.set(userId, socket.id);
      
      // Join user to their personal room
      socket.join(`user:${userId}`);
      
      // Handle workspace joining
      socket.on('join-workspace', (workspace_id: string) => {
        socket.join(`workspace:${workspace_id}`);
        
        // Track user rooms
        if (!this.userRooms.has(userId)) {
          this.userRooms.set(userId, []);
        }
        const rooms = this.userRooms.get(userId)!;
        if (!rooms.includes(`workspace:${workspace_id}`)) {
          rooms.push(`workspace:${workspace_id}`);
        }
        
        this.logger.info(`User ${userId} joined workspace ${workspace_id}`);
      });
      
      // Handle workspace leaving
      socket.on('leave-workspace', (workspace_id: string) => {
        socket.leave(`workspace:${workspace_id}`);
        
        // Update user rooms tracking
        if (this.userRooms.has(userId)) {
          const rooms = this.userRooms.get(userId)!;
          const index = rooms.indexOf(`workspace:${workspace_id}`);
          if (index !== -1) {
            rooms.splice(index, 1);
          }
        }
        
        this.logger.info(`User ${userId} left workspace ${workspace_id}`);
      });
      
      // Handle task updates
      socket.on('task-update', (data: {
        workspace_id: string;
        taskId: string;
        taskType: string;
        update: any;
      }) => {
        this.io.to(`workspace:${data.workspace_id}`).emit('task-updated', {
          taskId: data.taskId,
          taskType: data.taskType,
          update: data.update,
          updatedBy: userId,
          timestamp: new Date()
        });
        
        this.logger.info(`Task updated by user ${userId}: ${data.taskId}`);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.logger.info(`User disconnected: ${userId}`);
        
        // Remove from tracking
        this.connectedUsers.delete(userId);
        this.userRooms.delete(userId);
      });
    });
  }

  // Send notification to a specific user
  sendNotificationToUser(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date()
    });
  }

  // Send notification to all users in a workspace
  sendNotificationToWorkspace(workspace_id: string, notification: any): void {
    this.io.to(`workspace:${workspace_id}`).emit('notification', {
      ...notification,
      timestamp: new Date()
    });
  }

  // Get the number of connected users
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Check if a user is connected
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}