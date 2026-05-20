/**
 * Ticket Category Types
 *
 * Feature-based types for ticket category management.
 * Extracted from the ticket module for admin CRUD operations.
 */

export type TicketCategory = {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  deletedAt?: string | null;
  ticketCount?: number;
};

export type TicketCategoryCreateRequest = {
  name: string;
  description?: string;
  isActive?: boolean;
};

export type TicketCategoryUpdateRequest = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

export type TicketCategoryListFilters = {
  includeInactive?: boolean;
};
