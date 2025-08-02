import { IUser } from '../../types/workspace.types';

export class User implements IUser {
  public id: string;
  public email: string;
  public username: string;
  public first_name: string;
  public last_name: string;
  public is_active: boolean;
  public avatar: string | null;
  public created_at: Date;
  public updated_at: Date;
  public password_hash ?: string;
  public is_verified?: boolean | null;
  public verified_at? : Date | null;

  constructor(
    id: string,
    email: string,
    username: string,
    first_name: string,
    last_name: string,
    is_active: boolean = true,
    avatar: string | null = null,
    created_at: Date = new Date(),
    updated_at: Date = new Date(),
    password_hash: string = '',
    is_verified: boolean | null = false,
    verified_at: Date | null = null
  ) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.first_name = first_name;
    this.last_name = last_name;
    this.is_active = is_active;
    this.avatar = avatar;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.password_hash = password_hash;
    this.is_verified = is_verified;
    this.verified_at = verified_at;
  }

  // Getter for full name
  get fullName(): string {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  // Method to get user without sensitive data
  public toSafeObject(): Omit<IUser, 'password_hash'> {
    const { password_hash, ...safeUser } = this;
    return safeUser;
  }

  // Method to check if user can login (active and verified)
  public canLogin(): boolean {
    return this.is_active && !!this.is_verified;
  }

  public needsVerification(): boolean {
    return this.is_active && !this.is_verified;
  }


  // Method to update basic profile info
  public updateProfile(updates: Partial<Pick<IUser, 'first_name' | 'last_name' | 'username' | 'avatar'>>): void {
    if (updates.first_name !== undefined) this.first_name = updates.first_name;
    if (updates.last_name !== undefined) this.last_name = updates.last_name;
    if (updates.username !== undefined) this.username = updates.username;
    if (updates.avatar !== undefined) this.avatar = updates.avatar;
    this.updated_at = new Date();
  }

  // Method to mark as verified
  public markAsVerified(): void {
    this.is_verified = true;
    this.verified_at = new Date();
    this.updated_at = new Date();
  }

  // Method to deactivate user
  public deactivate(): void {
    this.is_active = false;
    this.updated_at = new Date();
  }

  // Method to reactivate user
  public reactivate(): void {
    this.is_active = true;
    this.updated_at = new Date();
  }

  // Static method to create a new user instance
  public static create(userData: {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    password_hash: string;
    avatar?: string | null;
  }): User {
    return new User(
      '', // ID will be set by repository
      userData.email,
      userData.username,
      userData.first_name,
      userData.last_name,
      true, // is_active
      userData.avatar || null,
      new Date(), // created_at
      new Date(), // updated_at
      userData.password_hash,
      false, // is_verified - new users need verification
      null // verified_at
    );
  }

  // Method to validate user data
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('Valid email is required');
    }

    if (!this.username || this.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!this.first_name || this.first_name.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!this.last_name || this.last_name.trim().length === 0) {
      errors.push('Last name is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Helper method to validate email format
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}