
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
