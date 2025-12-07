import { type UserProfile, type UserRegistration } from "@shared/schema";

type User = UserProfile;
type InsertUser = Omit<UserRegistration, 'password_confirm'>;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private nextId: number;

  constructor() {
    this.users = new Map();
    this.nextId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.nextId++;
    const user: User = { 
      id,
      username: insertUser.username,
      email: insertUser.email,
      first_name: insertUser.first_name,
      last_name: insertUser.last_name,
      phone: insertUser.phone,
      role: insertUser.role,
      role_display: insertUser.role === 'proprietaire' ? 'Propriétaire' : 'Client',
      date_joined: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
