/**
 * Department Types
 * 
 * Defines the structure for department data, responses, and API payloads.
 */

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
};

export type Department = {
  id: string;
  name: string;
  headUserId: string | null;
  headUser?: User;
  members?: User[];
};

export type CreateDepartmentRequest = {
  name: string;
  headUserId?: string;
};

export type UpdateDepartmentRequest = {
  name?: string;
  headUserId?: string | null;
};

export type DepartmentResponse = Department;

export type DepartmentsListResponse = Department[];
