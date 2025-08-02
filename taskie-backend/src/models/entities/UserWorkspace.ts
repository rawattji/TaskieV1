import { IUserWorkspace, PermissionLevel, WorkspaceRole } from "../../types/workspace.types";

export class UserWorkspace implements IUserWorkspace {
  constructor(
    public id: string,
    public user_id: string,
    public workspace_id: string,
    public role: WorkspaceRole,
    public permissions: PermissionLevel,
    public is_active: boolean = true,
    public team_id?: string,
    public joined_at: Date = new Date()
  ) {}

  public updateRole(role: WorkspaceRole): void {
    this.role = role;
  }

  public updatePermissions(permissions: PermissionLevel): void {
    this.permissions = permissions;
  }

  public assignToTeam(team_id: string): void {
    this.team_id = team_id;
  }

  public removeFromTeam(): void {
    this.team_id = undefined;
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