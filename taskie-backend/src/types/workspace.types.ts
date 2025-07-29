export interface IWorkspace {
  id: string;
  name: string;
  domain: string;
  description?: string;
  logo?: string;
  isActive: boolean;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceSettings {
  allowExternalInvites: boolean;
  defaultPermissions: PermissionLevel;
  timeZone: string;
  workingHours: {
    start: string;
    end: string;
    workingDays: number[];
  };
}

export interface IDepartment {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
  managerId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeam {
  id: string;
  workspaceId: string;
  departmentId: string;
  name: string;
  description?: string;
  leadId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserWorkspace {
  id: string;
  userId: string;
  workspaceId: string;
  teamId?: string;
  role: WorkspaceRole;
  permissions: PermissionLevel;
  joinedAt: Date;
  isActive: boolean;
}

export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export enum PermissionLevel {
  FULL = 'FULL',
  WRITE = 'WRITE',
  READ = 'READ',
  NONE = 'NONE'
}