import { IUser } from "../../types/workspace.types";

export class User implements IUser {
  constructor(
    public id: string,
    public email: string,
    public username: string,
    public firstName: string,
    public lastName: string,
    public isActive: boolean = true,
    public avatar?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public updateProfile(updates: Partial<Pick<User, 'firstName' | 'lastName' | 'avatar'>>): void {
    Object.assign(this, updates);
    this.updatedAt = new Date();
  }

  public deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }
}