import { IUserWorkspace, PermissionLevel, WorkspaceRole } from "../../types/workspace.types";

export class UserWorkspace implements IUserWorkspace {
  constructor(
    public id: string,
    public userId: string,
    public workspaceId: string,
    public role: WorkspaceRole,
    public permissions: PermissionLevel,
    public isActive: boolean = true,
    public teamId?: string,
    public joinedAt: Date = new Date()
  ) {}

  public updateRole(role: WorkspaceRole): void {
    this.role = role;
  }

  public updatePermissions(permissions: PermissionLevel): void {
    this.permissions = permissions;
  }

  public assignToTeam(teamId: string): void {
    this.teamId = teamId;
  }

  public removeFromTeam(): void {
    this.teamId = undefined;
  }

  public hasPermission(requiredPermission: PermissionLevel): boolean {
    const permissionHierarchy = {
      [PermissionLevel.NONE]: 0,
      [PermissionLevel.READ]: 1,
      [PermissionLevel.WRITE]: 2,
      [PermissionLevel.FULL]: 3
    };

    return permissionHierarchy[this.permissions] >= permissionHierarchy[requiredPermission];
  }
}