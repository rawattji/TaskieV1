import { ITeam } from "../../types/workspace.types";

export class Team implements ITeam {
  constructor(
    public id: string,
    public workspace_id: string,
    public department_id: string,
    public name: string,
    public is_active: boolean = true,
    public description: string | null,
    public lead_id?: string | null,
    public created_at: Date = new Date(),
    public updated_at: Date = new Date()
  ) {}

  public assignLead(lead_id: string): void {
    this.lead_id = lead_id;
    this.updated_at = new Date();
  }

  public removeLead(): void {
    this.lead_id = undefined;
    this.updated_at = new Date();
  }
}