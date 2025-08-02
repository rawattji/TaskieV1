import { IStory } from "../../types/task.types";

export class Story implements IStory {
  constructor(
    public id: string,
    public name: string,
    public workspace_id: string,
    public epic_id: string,
    public department_id?: string,
    public team_id?: string,
    public assignee_id?: string,
    public creator_id?: string,
    public priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM',
    public status: 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' = 'CREATED',
    public description?: string,
    public start_date?: Date,
    public end_date?: Date,
    public estimated_hours?: number,
    public tags: string[] = [],
    public type: 'STORY' = 'STORY',
    public created_at: Date = new Date(),
    public updated_at: Date = new Date()
  ) {}

  public update(updated_ata: Partial<IStory>): void {
    Object.assign(this, updated_ata);
    this.updated_at = new Date();
  }

  public assignTo(assignee_id: string): void {
    this.assignee_id = assignee_id;
    this.updated_at = new Date();
  }

  public changeStatus(status: 'CREATED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED'): void {
    this.status = status;
    this.updated_at = new Date();
  }

  public isOverdue(): boolean {
    if (!this.end_date) return false;
    return new Date() > this.end_date && this.status !== 'COMPLETED';
  }
}