import {IDepartment} from "../../types/workspace.types";
export class Department implements IDepartment {
  constructor(
    public id: string,
    public workspace_id: string,
    public name: string,
    public is_active: boolean = true,
    public description: string | null = null,
    public parent_department_id: string | null = null,
    public manager_id: string | null = null,
    public created_at: Date = new Date(),
    public updated_at: Date = new Date()
  ) {}

  public updateManager(manager_id: string): void {
    this.manager_id = manager_id;
    this.updated_at = new Date();
  }

  public setParent(parent_department_id: string): void {
    this.parent_department_id = parent_department_id;
    this.updated_at = new Date();
  }
}