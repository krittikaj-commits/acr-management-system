/** User entity interface */
export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string | null;
  roleId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Role entity interface */
export interface IRole {
  id: string;
  name: string;
  permissions: Record<string, unknown>;
  createdAt: Date;
}
