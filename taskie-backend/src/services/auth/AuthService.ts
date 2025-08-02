import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../models/repositories/UserRepository';
import { WorkspaceRepository } from '../../models/repositories/WorkspaceRepository';
import { Logger } from '../../utils/logger';
import { IUser, WorkspaceRole } from '../../types/workspace.types';
import type { SignOptions, Secret } from 'jsonwebtoken';

interface RegisterData {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  workspace_domain?: string;
}

interface AuthResult {
  success: boolean;
  data?: {
    token: string;
    refreshToken?: string;
    user: Omit<IUser, 'password_hash'>;
    workspace?: any;
    requiresOTP?: boolean;
    email?: string;
  };
  error?: string;
}

export class AuthService {
  private userRepository: UserRepository;
  private workspaceRepository: WorkspaceRepository;
  private logger: Logger;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private jwtExpiry: string;
  private jwtRefreshExpiry: string;

  constructor(
    userRepository: UserRepository,
    workspaceRepository: WorkspaceRepository,
    logger: Logger
  ) {
    this.userRepository = userRepository;
    this.workspaceRepository = workspaceRepository;
    this.logger = logger;
    
    this.jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
    this.jwtExpiry = process.env.JWT_EXPIRES_IN || '24h';
    this.jwtRefreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!process.env.JWT_SECRET) {
      this.logger.warn('JWT_SECRET not set in environment variables');
    }
  }

  async register(data: RegisterData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      const existingUsername = await this.userRepository.findByUsername(data.username);
      if (existingUsername) {
        return { success: false, error: 'Username is already taken' };
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const password_hash = await bcrypt.hash(data.password, saltRounds);

      // Create user data (initially unverified)
      const userData = {
        email: data.email,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        password_hash,
        is_active: true,
        is_verified: false, // Set as unverified initially
        avatar: null,
        verified_at: null
      };

      // Create user
      const user = await this.userRepository.create(userData);

      // Create workspace if domain provided
      let workspace = null;
      if (data.workspace_domain) {
        try {
          workspace = await this.workspaceRepository.create({
            name: `${data.first_name}'s Workspace`,
            domain: data.workspace_domain,
            description: `Workspace for ${data.first_name} ${data.last_name}`,
            is_active: true
          });

          // Associate user with workspace
          await this.workspaceRepository.addUserToWorkspace(workspace.id, user.id, WorkspaceRole.OWNER, true);
        } catch (workspaceError) {
          this.logger.warn('Failed to create workspace during registration:', workspaceError);
          // Continue without workspace - user can create one later
        }
      }

      this.logger.info(`User registered successfully: ${user.email}`);

      // Return success - user needs to verify email
      return {
        success: true,
        data: {
          requiresOTP: true,
          email: user.email,
          token: '', // No token until verified
          user: this.sanitizeUser(user),
          workspace
        }
      };

    } catch (error: any) {
      this.logger.error('Registration error:', error);
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      };
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }
      if (!user.password_hash) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check if user is verified
      if (!user.is_verified) {
        this.logger.info(`Unverified user login attempt: ${email}`);
        return {
          success: true,
          data: {
            requiresOTP: true,
            email: user.email,
            token: '',
            user: this.sanitizeUser(user)
          }
        };
      }

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Get user's workspace
      const workspace = await this.getUserWorkspace(user.id);

      this.logger.info(`User logged in successfully: ${user.email}`);

      return {
        success: true,
        data: {
          requiresOTP: false,
          token,
          refreshToken,
          user: this.sanitizeUser(user),
          workspace
        }
      };

    } catch (error: any) {
      this.logger.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  }

  async verifyUserEmail(email: string): Promise<AuthResult> {
    try {
      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Mark user as verified
      const updatedUser = await this.userRepository.update(user.id, {
        is_verified: true,
        verified_at: new Date()
      });

      if (!updatedUser) {
        return { success: false, error: 'Failed to verify user' };
      }

      // Generate tokens
      const token = this.generateToken(updatedUser);
      const refreshToken = this.generateRefreshToken(updatedUser);

      // Get user's workspace
      const workspace = await this.getUserWorkspace(updatedUser.id);

      this.logger.info(`User email verified successfully: ${email}`);

      return {
        success: true,
        data: {
          token,
          refreshToken,
          user: this.sanitizeUser(updatedUser),
          workspace
        }
      };

    } catch (error: any) {
      this.logger.error('Email verification error:', error);
      return { 
        success: false, 
        error: error.message || 'Email verification failed' 
      };
    }
  }

  async checkUserExists(email: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByEmail(email);
      return !!user;
    } catch (error) {
      this.logger.error('Error checking user existence:', error);
      return false;
    }
  }

  async getUserProfile(userId: string): Promise<AuthResult> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const workspace = await this.getUserWorkspace(userId);

      return {
        success: true,
        data: {
          token: '', // Not needed for profile
          user: this.sanitizeUser(user),
          workspace
        }
      };

    } catch (error: any) {
      this.logger.error('Get profile error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to get user profile' 
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      // Get user
      const user = await this.userRepository.findById(decoded.userId);
      if (!user || !user.is_verified) {
        return { success: false, error: 'Invalid refresh token' };
      }

      // Generate new tokens
      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          user: this.sanitizeUser(user)
        }
      };

    } catch (error: any) {
      this.logger.error('Refresh token error:', error);
      return { 
        success: false, 
        error: 'Invalid refresh token' 
      };
    }
  }

  async verifyToken(token: string): Promise<{ valid: boolean; user?: IUser }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const user = await this.userRepository.findById(decoded.userId);
      
      if (!user || !user.is_verified) {
        return { valid: false };
      }

      return { valid: true, user };

    } catch (error) {
      return { valid: false };
    }
  }

  private generateToken(user: IUser): string {
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username
    };

    const options: SignOptions = {
      issuer: process.env.JWT_ISSUER || 'taskie-platform',
      audience: process.env.JWT_AUDIENCE || 'taskie-users'
    };

    return jwt.sign(payload, this.jwtSecret as Secret, options);
  }


  private generateRefreshToken(user: IUser): string {
    const payload = {
      userId: user.id,
      type: 'refresh'
    };

    return jwt.sign(payload, this.jwtRefreshSecret, {
      issuer: process.env.JWT_ISSUER || 'taskie-platform',
      audience: process.env.JWT_AUDIENCE || 'taskie-users'
    });
  }

  private sanitizeUser(user: IUser): Omit<IUser, 'password_hash'> {
    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  private async getUserWorkspace(userId: string): Promise<any> {
    try {
      // Get user's primary workspace
      const workspaces = await this.workspaceRepository.findByUserId(userId);
      return workspaces.length > 0 ? workspaces[0] : null;
    } catch (error) {
      this.logger.warn('Failed to get user workspace:', error);
      return null;
    }
  }
}