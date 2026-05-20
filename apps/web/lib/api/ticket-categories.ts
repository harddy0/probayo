/**
 * Ticket Categories API Module
 *
 * Feature-based API functions for ticket category CRUD operations.
 * Can be imported by any role (admin, IT staff, etc.).
 */

import { request } from "./client";
import type {
  TicketCategory,
  TicketCategoryCreateRequest,
  TicketCategoryUpdateRequest,
} from "../types/ticket-categories";

const buildCategoryQuery = (includeInactive?: boolean) => {
  if (!includeInactive) return "";
  const params = new URLSearchParams();
  params.set("includeInactive", "true");
  return `?${params.toString()}`;
};

/**
 * Fetch all ticket categories, optionally including inactive ones.
 */
export const fetchTicketCategories = async (
  includeInactive?: boolean,
): Promise<TicketCategory[]> => {
  const query = buildCategoryQuery(includeInactive);
  return request<TicketCategory[]>(`/ticket-categories${query}`);
};

/**
 * Fetch a single ticket category by ID.
 */
export const fetchTicketCategoryById = async (
  id: string,
): Promise<TicketCategory> => {
  return request<TicketCategory>(`/ticket-categories/${id}`);
};

/**
 * Create a new ticket category (Admin only).
 */
export const createTicketCategory = async (
  data: TicketCategoryCreateRequest,
): Promise<TicketCategory> => {
  return request<TicketCategory>("/ticket-categories", {
    method: "POST",
    body: data,
  });
};

/**
 * Update an existing ticket category (Admin only).
 */
export const updateTicketCategory = async (
  id: string,
  data: TicketCategoryUpdateRequest,
): Promise<TicketCategory> => {
  return request<TicketCategory>(`/ticket-categories/${id}`, {
    method: "PATCH",
    body: data,
  });
};

/**
 * Delete a ticket category (Admin only).
 */
export const deleteTicketCategory = async (id: string): Promise<void> => {
  await request<void>(`/ticket-categories/${id}`, {
    method: "DELETE",
  });
};
