export interface IWorkspace {
  id: string;
  name: string;
  domain: string;
  description?: string;
  logo?: string;
  is_active: boolean;
  settings?: WorkspaceSettings;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceSettings {
  allow_external_invites?: boolean;
  default_permissions?: PermissionLevel;
  timeZone?: string;
  working_hours?: {
    start: string;
    end: string;
    working_days: number[];
  };
}


export interface IDepartment {
  id: string;
  workspace_id: string;
  name: string;
  description ?: string | null;
  is_active: boolean;
  parent_department_id: string | null;
  manager_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ITeam {
  id: string;
  workspace_id: string;
  department_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  lead_id?: string | null;
  created_at: Date;
  updated_at: Date;
}


export interface IUser {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  avatar: string | null;
  created_at: Date;
  updated_at: Date;
  password_hash?: string;
  is_verified?: boolean | null;        // New field for email verification
  verified_at?: Date | null;    // New field for verification timestamp
}

export interface IUserWorkspace {
  id: string;
  user_id: string;
  workspace_id: string;
  team_id?: string;
  role: WorkspaceRole;
  permissions: PermissionLevel;
  joined_at?: Date;
  is_active: boolean;
}

export interface TeamMember {
  user_id: string;
  user: IUser;
  joined_at: Date;
  role: WorkspaceRole;
  is_active: boolean;
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

// Auth-related types
export interface AuthTokenPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}
