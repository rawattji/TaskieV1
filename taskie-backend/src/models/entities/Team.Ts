import { ITeam } from "../../types/workspace.types";

export class Team implements ITeam {
  constructor(
    public id: string,
    public workspaceId: string,
    public departmentId: string,
    public name: string,
    public isActive: boolean = true,
    public description?: string,
    public leadId?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  public assignLead(leadId: string): void {
    this.leadId = leadId;
    this.updatedAt = new Date();
  }

  public removeLead(): void {
    this.leadId = undefined;
    this.updatedAt = new Date();
  }
}