import { IWorkspace, PermissionLevel, WorkspaceSettings } from "../../types/workspace.types";

export class Workspace implements IWorkspace {
  constructor(
    public id: string,
    public name: string,
    public domain: string,
    public is_active: boolean = true,
    public settings: WorkspaceSettings = {
      allow_external_invites: false,
      default_permissions: PermissionLevel.READ,
      timeZone: 'UTC',
      working_hours: {
        start: '09:00',
        end: '17:00',
        working_days: [1, 2, 3, 4, 5]
      }
    },
    public description?: string,
    public logo?: string,
    public created_at: Date = new Date(),
    public updated_at: Date = new Date()
  ) {}

  public updateSettings(newSettings: Partial<WorkspaceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.updated_at = new Date();
  }

  public deactivate(): void {
    this.is_active = false;
    this.updated_at = new Date();
  }

  public activate(): void {
    this.is_active = true;
    this.updated_at = new Date();
  }
}
