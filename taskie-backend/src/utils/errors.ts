export enum ErrorCodes {
  USER_ALREADY_IN_WORKSPACE = 'USER_ALREADY_IN_WORKSPACE',
  USER_WORKSPACE_NOT_FOUND = 'USER_WORKSPACE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  DOMAIN_EXISTS = 'DOMAIN_EXISTS',
  CANNOT_REMOVE_OWNER = 'CANNOT_REMOVE_OWNER',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  WORKSPACE_OWNER_NOT_FOUND = 'WORKSPACE_OWNER_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TEAM_NOT_FOUND = 'TEAM_NOT_FOUND',
  DEPARTMENT_NOT_FOUND = 'DEPARTMENT_NOT_FOUND',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',
  OTP_EXPIRED = 'OTP_EXPIRED',
  INVALID_OTP = 'INVALID_OTP',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS'
}

export class WorkspaceError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string, code: ErrorCodes, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, WorkspaceError.prototype);
  }
}

export class ValidationError extends Error {
  public code?: string;
  public statusCode: number;
  public details?: any;

  constructor(...args: any[]) {
    const [message, code, statusCode, details] = args;

    super(message || 'Validation failed');
    this.name = 'ValidationError';

    if (code) this.code = code;
    this.statusCode = typeof statusCode === 'number' ? statusCode : 400;
    if (details) this.details = details;

    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}


export class AuthenticationError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string = 'Authentication failed', code: ErrorCodes = ErrorCodes.AUTHENTICATION_FAILED, statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string = 'Authorization failed', code: ErrorCodes = ErrorCodes.AUTHORIZATION_FAILED, statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string = 'Resource not found', code: ErrorCodes = ErrorCodes.UNKNOWN_ERROR, statusCode = 404) {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string = 'Resource conflict', code: ErrorCodes = ErrorCodes.UNKNOWN_ERROR, statusCode = 409) {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class TokenExpiredError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string = 'Token has expired', code: ErrorCodes = ErrorCodes.TOKEN_EXPIRED, statusCode = 401) {
    super(message);
    this.name = 'TokenExpiredError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class InvalidTokenError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string = 'Invalid token', code: ErrorCodes = ErrorCodes.INVALID_TOKEN, statusCode = 401) {
    super(message);
    this.name = 'InvalidTokenError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class OTPError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string, code: ErrorCodes = ErrorCodes.INVALID_OTP, statusCode = 400) {
    super(message);
    this.name = 'OTPError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, OTPError.prototype);
  }
}

export class DatabaseError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string, code: ErrorCodes = ErrorCodes.UNKNOWN_ERROR, statusCode = 500) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class ExternalServiceError extends Error {
  public code: ErrorCodes;
  public statusCode: number;
  constructor(message: string, code: ErrorCodes = ErrorCodes.UNKNOWN_ERROR, statusCode = 502) {
    super(message);
    this.name = 'ExternalServiceError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

// Factory functions for creating errors with specific error codes
export const Errors = {
  // Authentication errors
  authenticationFailed: (message?: string) => new AuthenticationError(
    message || 'Authentication failed',
    ErrorCodes.AUTHENTICATION_FAILED
  ),
  
  authorizationFailed: (message?: string) => new AuthorizationError(
    message || 'Authorization failed',
    ErrorCodes.AUTHORIZATION_FAILED
  ),
  
  tokenExpired: (message?: string) => new TokenExpiredError(
    message || 'Token has expired',
    ErrorCodes.TOKEN_EXPIRED
  ),
  
  invalidToken: (message?: string) => new InvalidTokenError(
    message || 'Invalid token',
    ErrorCodes.INVALID_TOKEN
  ),
  
  // Validation errors
  validationFailed: (message?: string, details?: any) => new ValidationError(
    message || 'Validation failed',
    ErrorCodes.VALIDATION_FAILED,
    400,
    details
  ),
  
  // Resource not found errors
  userNotFound: (message?: string) => new NotFoundError(
    message || 'User not found',
    ErrorCodes.USER_NOT_FOUND
  ),
  
  workspaceNotFound: (message?: string) => new NotFoundError(
    message || 'Workspace not found',
    ErrorCodes.WORKSPACE_NOT_FOUND
  ),
  
  teamNotFound: (message?: string) => new NotFoundError(
    message || 'Team not found',
    ErrorCodes.TEAM_NOT_FOUND
  ),
  
  departmentNotFound: (message?: string) => new NotFoundError(
    message || 'Department not found',
    ErrorCodes.DEPARTMENT_NOT_FOUND
  ),
  
  taskNotFound: (message?: string) => new NotFoundError(
    message || 'Task not found',
    ErrorCodes.TASK_NOT_FOUND
  ),
  
  notificationNotFound: (message?: string) => new NotFoundError(
    message || 'Notification not found',
    ErrorCodes.NOTIFICATION_NOT_FOUND
  ),
  
  userWorkspaceNotFound: (message?: string) => new NotFoundError(
    message || 'User workspace relationship not found',
    ErrorCodes.USER_WORKSPACE_NOT_FOUND
  ),
  
  workspaceOwnerNotFound: (message?: string) => new NotFoundError(
    message || 'Workspace owner not found',
    ErrorCodes.WORKSPACE_OWNER_NOT_FOUND
  ),
  
  // Conflict errors
  userAlreadyInWorkspace: (message?: string) => new ConflictError(
    message || 'User is already a member of this workspace',
    ErrorCodes.USER_ALREADY_IN_WORKSPACE
  ),
  
  domainExists: (message?: string) => new ConflictError(
    message || 'Domain already exists',
    ErrorCodes.DOMAIN_EXISTS
  ),
  
  emailAlreadyExists: (message?: string) => new ConflictError(
    message || 'Email already exists',
    ErrorCodes.EMAIL_ALREADY_EXISTS
  ),
  
  usernameAlreadyExists: (message?: string) => new ConflictError(
    message || 'Username already exists',
    ErrorCodes.USERNAME_ALREADY_EXISTS
  ),
  
  // Permission errors
  permissionDenied: (message?: string) => new AuthorizationError(
    message || 'Permission denied',
    ErrorCodes.PERMISSION_DENIED
  ),
  
  insufficientPermissions: (message?: string) => new AuthorizationError(
    message || 'Insufficient permissions',
    ErrorCodes.INSUFFICIENT_PERMISSIONS
  ),
  
  accessDenied: (message?: string) => new AuthorizationError(
    message || 'Access denied',
    ErrorCodes.ACCESS_DENIED
  ),
  
  cannotRemoveOwner: (message?: string) => new AuthorizationError(
    message || 'Cannot remove workspace owner',
    ErrorCodes.CANNOT_REMOVE_OWNER
  ),
  
  // OTP errors
  otpExpired: (message?: string) => new OTPError(
    message || 'OTP has expired',
    ErrorCodes.OTP_EXPIRED
  ),
  
  invalidOTP: (message?: string) => new OTPError(
    message || 'Invalid OTP',
    ErrorCodes.INVALID_OTP
  ),
  
  // Database and service errors
  databaseError: (message?: string) => new DatabaseError(
    message || 'Database error occurred',
    ErrorCodes.UNKNOWN_ERROR
  ),
  
  externalServiceError: (message?: string) => new ExternalServiceError(
    message || 'External service error occurred',
    ErrorCodes.UNKNOWN_ERROR
  ),
  
  // Generic errors
  unknownError: (message?: string) => new WorkspaceError(
    message || 'An unknown error occurred',
    ErrorCodes.UNKNOWN_ERROR,
    500
  )
};