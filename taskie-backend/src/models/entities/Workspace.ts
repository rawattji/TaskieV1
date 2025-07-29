import { IWorkspace, PermissionLevel, WorkspaceSettings } from "../../types/workspace.types";

export class Workspace implements IWorkspace {
  constructor(
    public id: string,
    public name: string,
    public domain: string,
    public isActive: boolean = true,
    public settings: WorkspaceSettings = {
      allowExternalInvites: false,
      defaultPermissions: PermissionLevel.READ,
      timeZone: 'UTC',
      workingHours: {
        start: '09:00',
        end: '17:00',
        workingDays: [1, 2, 3, 4, 5]
      }
    },
    public description?: string,
    public logo?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  public updateSettings(newSettings: Partial<WorkspaceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.updatedAt = new Date();
  }

  public deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  public activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }
}
