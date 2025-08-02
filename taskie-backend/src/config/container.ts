import { Logger } from '../utils/logger';
import { DatabaseConnection } from '../database/connection';
import { RedisConnection } from './redis';

// Repositories
import { WorkspaceRepository } from '../models/repositories/WorkspaceRepository';
import { UserRepository } from '../models/repositories/UserRepository';
import { UserWorkspaceRepository } from '../models/repositories/UserWorkspaceRespository';
import { TeamRepository } from '../models/repositories/TeamRepository';
import { InitiativeRepository } from '../models/repositories/InitiativeRepository';
import { EpicRepository } from '../models/repositories/EpicRepository';
import { StoryRepository } from '../models/repositories/StoryRepository';
import { TaskRepository } from '../models/repositories/TaskRepository';
import { DepartmentRepository } from '../models/repositories/DepartmentRepository';

// Services
import { WorkspaceService } from '../services/workspace/WorkspaceService';
import { UserWorkspaceService } from '../services/workspace/UserWorkspaceService';
import { AuthService } from '../services/auth/AuthService';
import { OTPService } from '../services/auth/OTPService';
import { NotificationService } from '../services/notification/NotificationService';
import { EmailService } from '../services/notification/EmailService';
import { TeamService } from '../services/team/TeamService';
import { TaskService } from '../services/task/TaskService';

// Controllers
import { WorkspaceController } from '../controllers/workspace/WorkspaceController';
import { AuthController } from '../controllers/auth/AuthController';
import { TeamController } from '../controllers/team/TeamController';
import { NotificationController } from '../controllers/notification/NotificationController';
import { TaskController } from '../controllers/task/TaskController';

export class Container {
  private services: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    const logger = new Logger('Application');
    this.register('Logger', logger);

    const databaseConnection = new DatabaseConnection();
    await databaseConnection.initialize();
    const pool = databaseConnection.getPool();
    this.register('DatabaseConnection', databaseConnection);
    this.register('DatabasePool', pool);

    const redisConnection = new RedisConnection();
    await redisConnection.initialize();
    const redisClient = redisConnection.getClient();
    this.register('RedisConnection', redisConnection);
    this.register('RedisClient', redisClient);

    // Repositories
    const userRepository = new UserRepository(pool);
    const workspaceRepository = new WorkspaceRepository(pool);
    const userWorkspaceRepository = new UserWorkspaceRepository(pool);
    const teamRepository = new TeamRepository(pool);
    const departmentRepository = new DepartmentRepository(pool);
    const initiativeRepository = new InitiativeRepository(pool);
    const epicRepository = new EpicRepository(pool);
    const storyRepository = new StoryRepository(pool);
    const taskRepository = new TaskRepository(pool);

    this.register('UserRepository', userRepository);
    this.register('WorkspaceRepository', workspaceRepository);
    this.register('UserWorkspaceRepository', userWorkspaceRepository);
    this.register('TeamRepository', teamRepository);
    this.register('DepartmentRepository', departmentRepository);
    this.register('InitiativeRepository', initiativeRepository);
    this.register('EpicRepository', epicRepository);
    this.register('StoryRepository', storyRepository);
    this.register('TaskRepository', taskRepository);

    // Services
    const userWorkspaceService = new UserWorkspaceService(pool, logger);
    const emailService = new EmailService(userRepository, logger);
    const otpService = new OTPService( pool, emailService, logger);
    const notificationService = new NotificationService(pool, emailService, redisClient, userRepository, logger);
    const workspaceService = new WorkspaceService(workspaceRepository, userRepository, teamRepository, userWorkspaceService, notificationService, logger);
    const authService = new AuthService(userRepository, workspaceRepository, logger);
    const teamService = new TeamService(teamRepository, userRepository, departmentRepository, userWorkspaceRepository, logger);
    const taskService = new TaskService(initiativeRepository, epicRepository, storyRepository, taskRepository, workspaceRepository, logger);

    this.register('UserWorkspaceService', userWorkspaceService);
    this.register('EmailService', emailService);
    this.register('OTPService', otpService);
    this.register('NotificationService', notificationService);
    this.register('WorkspaceService', workspaceService);
    this.register('AuthService', authService);
    this.register('TeamService', teamService);
    this.register('TaskService', taskService);

    // Controllers
    this.register('WorkspaceController', new WorkspaceController(workspaceService, userWorkspaceService, logger));
    this.register('AuthController', new AuthController(authService, otpService, logger));
    this.register('TeamController', new TeamController(teamService, logger));
    this.register('NotificationController', new NotificationController(notificationService, logger));
    this.register('TaskController', new TaskController(taskService, logger));
  }

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not found in container`);
    }
    return service;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }
}
