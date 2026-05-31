/**
 * User Types
 *
 * Defines the structure for user data, API payloads, and responses.
 * Used across admin user management and other modules.
 */

export type SimpleUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  departmentId?: string | null;
};

export type UpdateUserProfilePayload = {
  firstName?: string;
  lastName?: string;
};

export type UpdateUserStatusPayload = {
  isActive: boolean;
};

/**
 * Payload for creating a new user.
 * Matches the backend's CreateUserDto schema.
 */
export type CreateUserPayload = {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: "Admin" | "ItStaff" | "Employee" | "DepartmentHead";
  departmentId?: string | null;
  isActive?: boolean;
};
