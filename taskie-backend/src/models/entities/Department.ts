import {IDepartment} from "../../types/workspace.types";
export class Department implements IDepartment {
  constructor(
    public id: string,
    public workspaceId: string,
    public name: string,
    public isActive: boolean = true,
    public description?: string,
    public parentDepartmentId?: string,
    public managerId?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  public updateManager(managerId: string): void {
    this.managerId = managerId;
    this.updatedAt = new Date();
  }

  public setParent(parentDepartmentId: string): void {
    this.parentDepartmentId = parentDepartmentId;
    this.updatedAt = new Date();
  }
}