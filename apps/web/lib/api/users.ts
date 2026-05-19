/**
 * Users API Module
 *
 * Minimal helper to fetch users for UI dropdowns.
 */

import { request } from "./client";

export type SimpleUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export const fetchAllUsers = async (): Promise<SimpleUser[]> => {
  return request<SimpleUser[]>("/users");
};
