/**
 * Users API Module
 *
 * User management: fetching, updating profiles, and password changes.
 */

import { request } from "./client";
import type { UserProfile } from "../types/auth";
import type { CreateUserPayload, SimpleUser, UpdateUserProfilePayload, UpdateUserStatusPayload } from "../types/users";

export const fetchAllUsers = async (): Promise<SimpleUser[]> => {
  return request<SimpleUser[]>("/users");
};

export const updateUserProfile = async (
  userId: string,
  payload: UpdateUserProfilePayload,
): Promise<UserProfile> => {
  return request<UserProfile>(`/users/${userId}`, {
    method: "PATCH",
    body: payload,
  });
};

/**
 * Update a user's active/inactive status.
 * Calls PATCH /users/{id}/status with { isActive }.
 */
export const updateUserStatus = async (
  userId: string,
  payload: UpdateUserStatusPayload,
): Promise<void> => {
  return request<void>(`/users/${userId}/status`, {
    method: "PATCH",
    body: payload,
  });
};

/**
 * Reset a user's password to the default value (12345678password).
 * Calls POST /users/{id}/reset-password.
 */
export const resetUserPassword = async (userId: string): Promise<void> => {
  return request<void>(`/users/${userId}/reset-password`, {
    method: "POST",
  });
};
/**
 * Create a new user.
 * Calls POST /users with the user data.
 */
export const createUser = async (payload: CreateUserPayload): Promise<SimpleUser> => {
  return request<SimpleUser>("/users", {
    method: "POST",
    body: payload,
  });
};


