/**
 * Users API Module
 *
 * User management: fetching, updating profiles, and password changes.
 */

import { request } from "./client";
import type { UserProfile } from "../types/auth";

export type SimpleUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type UpdateUserProfilePayload = {
  firstName?: string;
  lastName?: string;
  departmentId?: string;
};

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


