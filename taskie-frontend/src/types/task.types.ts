export interface TaskBase {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
  department_id?: string;
  team_id?: string;
  assignee_id?: string;
  creator_id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  start_date?: string;
  end_date?: string;
  estimated_hours?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Initiative extends TaskBase {
  type: 'INITIATIVE';
}

export interface Epic extends TaskBase {
  type: 'EPIC';
  initiative_id: string;
}

export interface Story extends TaskBase {
  type: 'STORY';
  epic_id: string;
}

export interface Task extends TaskBase {
  type: 'TASK';
  story_id: string;
}

export type AnyTask = Initiative | Epic | Story | Task;

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  domain: string;
  is_active: boolean;
  description?: string;
  logo?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  workspace_id: string;
  department_id: string;
  name: string;
  is_active: boolean;
  description?: string;
  lead_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  workspace_id: string;
  name: string;
  is_active: boolean;
  description?: string;
  parent_department_id?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskFilter {
  workspace_id?: string;
  department_id?: string;
  team_id?: string;
  assignee_id?: string;
  creator_id?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  type?: 'INITIATIVE' | 'EPIC' | 'STORY' | 'TASK';
  tags?: string[];
  start_date?: string;
  end_date?: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  inReview: number;
  created: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  overdue: number;
}

export interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  token: string | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ requiresOTP: true; email: string } | { requiresOTP: false }>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ requiresOTP: true; email: string } | { requiresOTP: false }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  workspace_domain?: string;
}