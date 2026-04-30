/**
 * Departments API Module
 * 
 * Handles all department-related API operations:
 * - Create, read, update, delete departments
 * - Fetch department lists with head user info
 * - Get individual department details with members
 * 
 * All endpoints require Admin authentication.
 */

import { request } from "./client";
import type {
  Department,
  DepartmentResponse,
  DepartmentsListResponse,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from "../types/departments";

/**
 * Get all departments
 * 
 * Fetches the complete list of departments with their head user info.
 * 
 * @returns Array of departments with headUser details
 * @throws ApiError if request fails
 */
export const fetchAllDepartments = async (): Promise<DepartmentsListResponse> => {
  return request<DepartmentsListResponse>("/departments");
};

/**
 * Get a single department by ID
 * 
 * Fetches detailed information about a specific department.
 * Includes head user details and list of department members.
 * 
 * @param id - Department ID
 * @returns Department with headUser and members array
 * @throws ApiError if department not found or request fails
 */
export const fetchDepartmentById = async (id: string): Promise<DepartmentResponse> => {
  return request<DepartmentResponse>(`/departments/${id}`);
};

/**
 * Create a new department
 * 
 * Creates a department with a name and optional head user assignment.
 * 
 * @param data - Department creation data (name required, headUserId optional)
 * @returns Created department with ID and details
 * @throws ApiError if creation fails (e.g., invalid headUserId)
 */
export const createDepartment = async (
  data: CreateDepartmentRequest
): Promise<DepartmentResponse> => {
  return request<DepartmentResponse>("/departments", {
    method: "POST",
    body: data,
  });
};

/**
 * Update a department (partial update)
 * 
 * Updates one or more fields of an existing department.
 * Fields not provided are left unchanged.
 * 
 * @param id - Department ID to update
 * @param data - Partial department data (name and/or headUserId)
 * @returns Updated department details
 * @throws ApiError if department not found or update fails
 */
export const updateDepartment = async (
  id: string,
  data: UpdateDepartmentRequest
): Promise<DepartmentResponse> => {
  return request<DepartmentResponse>(`/departments/${id}`, {
    method: "PATCH",
    body: data,
  });
};

/**
 * Delete a department
 * 
 * Permanently removes a department.
 * Ensure no employees are assigned before deletion.
 * 
 * @param id - Department ID to delete
 * @throws ApiError if department not found or has assigned members
 */
export const deleteDepartment = async (id: string): Promise<void> => {
  await request<void>(`/departments/${id}`, {
    method: "DELETE",
  });
};
