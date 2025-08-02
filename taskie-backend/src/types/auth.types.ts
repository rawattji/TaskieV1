import type { Request as ExpressRequest } from 'express';

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  avatar?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OTPRequest {
  email: string;
  otp: string;
}

export interface AuthenticatedRequest<
  Params = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, any>
> extends ExpressRequest<Params, ResBody, ReqBody, ReqQuery> {
  user: User;
}

export interface OTPVerification {
  email: string;
  otp: string;
  expires_at: Date;
  is_verified: boolean;
  created_at: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
  workspace?: {
    id: string;
    name: string;
    domain: string;
  };
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  workspace_domain?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// JWT Payload interface
export interface JWTPayload {
  id: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

// Authentication error types
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Authorization failed') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message: string = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}