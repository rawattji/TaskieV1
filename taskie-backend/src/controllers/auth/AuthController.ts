import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth/AuthService';
import { OTPService } from '../../services/auth/OTPService';
import { Logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/apiResponse';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types/auth.types';

export class AuthController {
  private authService: AuthService;
  private otpService: OTPService;
  private logger: Logger;

  constructor(authService: AuthService, otpService: OTPService, logger: Logger) {
    this.authService = authService;
    this.otpService = otpService;
    this.logger = logger;
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(ApiResponse.error('Validation failed', 400, errors.array()));
        return;
      }

      const { email, username, password, first_name, last_name, workspace_domain } = req.body;
      const result = await this.authService.register({ email, username, password, first_name, last_name, workspace_domain });

      if (result.success) {
        try {
          await this.otpService.generateOTP(email);
          res.status(201).json(ApiResponse.success({ requiresOTP: true, email, message: 'Registration successful. Please verify your email with the OTP sent to you.' }, 'Registration successful. OTP sent.'));
        } catch (otpError) {
          this.logger.error('Failed to send OTP after registration:', otpError);
          res.status(201).json(ApiResponse.success({ requiresOTP: true, email, message: 'Registration successful but failed to send OTP. Please try resending.' }, 'Registration successful'));
        }
      } else {
        res.status(400).json(ApiResponse.error(result.error || 'Registration failed', 400));
      }
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(ApiResponse.error('Validation failed', 400, errors.array()));
        return;
      }

      const { email, password } = req.body;
      const result = await this.authService.login(email, password);

      if (!result.success || !result.data) {
        res.status(401).json(ApiResponse.error(result.error || 'Invalid credentials', 401));
        return;
      }

      if (!result.data.user.is_verified) {
        try {
          await this.otpService.generateOTP(email);
          res.json(ApiResponse.success({ requiresOTP: true, email, message: 'Please verify your email with the OTP sent to you.' }, 'OTP sent. Please verify your email.'));
        } catch (otpError) {
          this.logger.error('Failed to send OTP during login:', otpError);
          res.status(500).json(ApiResponse.error('Failed to send verification code', 500));
        }
      } else {
        res.json(ApiResponse.success({ requiresOTP: false, token: result.data.token, user: result.data.user, workspace: result.data.workspace }, 'Login successful'));
      }
    } catch (error) {
      next(error);
    }
  };

  verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(ApiResponse.error('Validation failed', 400, errors.array()));
        return;
      }

      const { email, otp } = req.body;
      const otpValid = await this.otpService.verifyOTP(email, otp);

      if (!otpValid) {
        res.status(400).json(ApiResponse.error('Invalid or expired OTP', 400));
        return;
      }

      const result = await this.authService.verifyUserEmail(email);
      if (!result.success || !result.data) {
        res.status(500).json(ApiResponse.error(result.error || 'Verification failed', 500));
        return;
      }

      res.json(ApiResponse.success({ token: result.data.token, user: result.data.user, workspace: result.data.workspace }, 'Email verified successfully'));
    } catch (error) {
      next(error);
    }
  };

  resendOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(ApiResponse.error('Validation failed', 400, errors.array()));
        return;
      }

      const { email } = req.body;
      const userExists = await this.authService.checkUserExists(email);
      if (!userExists) {
        res.status(404).json(ApiResponse.error('User not found', 404));
        return;
      }

      await this.otpService.resendOTP(email);
      res.json(ApiResponse.success(null, 'OTP resent successfully'));
    } catch (error: any) {
      if (error.message.includes('wait')) {
        res.status(429).json(ApiResponse.error(error.message, 429));
      } else {
        next(error);
      }
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        this.logger.info(`User ${req.user?.id} logged out`);
      }
      res.json(ApiResponse.success(null, 'Logged out successfully'));
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.authService.getUserProfile(userId);

      if (!result.success || !result.data) {
        res.status(404).json(ApiResponse.error(result.error || 'User not found', 404));
        return;
      }

      res.json(ApiResponse.success(result.data, 'Profile retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(ApiResponse.error('Validation failed', 400, errors.array()));
        return;
      }

      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);

      if (!result.success || !result.data) {
        res.status(401).json(ApiResponse.error(result.error || 'Invalid refresh token', 401));
        return;
      }

      res.json(ApiResponse.success(result.data, 'Token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  };

  static registerValidation = [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('first_name').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required and must be less than 50 characters'),
    body('last_name').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required and must be less than 50 characters'),
    body('workspace_domain').optional().matches(/^[a-zA-Z0-9-]+$/).withMessage('Workspace domain can only contain letters, numbers, and hyphens')
  ];

  static loginValidation = [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ];

  static otpValidation = [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits').isNumeric().withMessage('OTP must contain only numbers')
  ];

  static resendOTPValidation = [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail()
  ];

  static refreshTokenValidation = [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ];
}
