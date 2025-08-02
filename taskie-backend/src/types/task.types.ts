export interface TaskBase {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
  department_id?: string;
  team_id?: string;
  assignee_id?: string;
  creator_id?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  start_date?: Date;
  end_date?: Date;
  estimated_hours?: number;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface IInitiative extends TaskBase {
  type: 'INITIATIVE';
}

export interface IEpic extends TaskBase {
  type: 'EPIC';
  initiative_id: string;
}

export interface IStory extends TaskBase {
  type: 'STORY';
  epic_id: string;
}

export interface ITask extends TaskBase {
  type: 'TASK';
  story_id: string;
}

export type AnyTask = IInitiative | IEpic | IStory | ITask;

export interface CreateTaskDto {
  name: string;
  description?: string;
  workspace_id: string;
  department_id?: string;
  team_id?: string;
  assignee_id?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  start_date?: Date;
  end_date?: Date;
  estimated_hours?: number;
  tags?: string[];
  type: 'INITIATIVE' | 'EPIC' | 'STORY' | 'TASK';
  initiative_id?: string;
  epic_id?: string;
  story_id?: string;
}

export interface UpdateTaskDto {
  name?: string;
  description?: string;
  department_id?: string;
  team_id?: string;
  assignee_id?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  start_date?: Date;
  end_date?: Date;
  estimated_hours?: number;
  tags?: string[];
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
  start_date?: Date;
  end_date?: Date;
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