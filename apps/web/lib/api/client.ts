/**
 * HTTP Client Module
 * 
 * Handles all API communication with the backend, including:
 * - Authentication session management (in-memory + sessionStorage)
 * - Automatic Authorization header injection
 * - Error handling and transformation
 * - Base URL resolution
 * 
 * Session Strategy:
 * - In-memory cache (authSession) for performance
 * - SessionStorage persistence for page reloads
 * - Lazy load from storage on first access (getAuthSession)
 * - Automatically attach Bearer token to all requests
 */

import type { AuthSession } from "../types/auth";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Configuration for HTTP requests (method, headers, body, abort signal) */
type RequestOptions = {
  method?: HttpMethod;
  headers?: HeadersInit;
  body?: unknown;
  signal?: AbortSignal;
};

/** Standardized error response from API or fetch failures */
export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

const AUTH_STORAGE_KEY = "probayo.auth";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * In-memory session cache
 * Holds the current auth session to avoid repeated sessionStorage lookups
 * Synced with sessionStorage on set/clear operations
 */
let authSession: AuthSession | null = null;

/**
 * Check if code is running in browser (SSR safety)
 * sessionStorage is only available in browser environments
 * Returns false during server-side rendering
 */
const hasWindow = () => typeof window !== "undefined";

/**
 * Load auth session from sessionStorage
 * 
 * Validates session structure before returning to ensure token and identity exist.
 * Returns null if:
 * - Not in browser environment (SSR)
 * - Session key doesn't exist in storage
 * - JSON parsing fails
 * - Required fields (token, identity.userId) are missing
 */
const loadAuthSession = (): AuthSession | null => {
  if (!hasWindow()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed?.identity?.userId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Persist auth session to sessionStorage
 * 
 * Syncs the in-memory session state with browser storage.
 * Supports both saving (session exists) and clearing (session is null).
 */
const persistAuthSession = (session: AuthSession | null) => {
  if (!hasWindow()) {
    return;
  }

  if (!session) {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

/**
 * Get the current authentication session
 * 
 * Lazy-loads from sessionStorage on first access.
 * Subsequent calls use the in-memory cache for performance.
 * Returns null if user is not authenticated.
 */
export const getAuthSession = (): AuthSession | null => {
  if (authSession) {
    return authSession;
  }

  authSession = loadAuthSession();
  return authSession;
};

/**
 * Set and persist the authentication session
 * 
 * Updates both in-memory cache and sessionStorage.
 * Called after successful login to store token and user identity.
 */
export const setAuthSession = (session: AuthSession) => {
  authSession = session;
  persistAuthSession(session);
};

/**
 * Clear the authentication session
 * 
 * Removes both in-memory cache and sessionStorage entry.
 * Called on logout to end the user's session.
 */
export const clearAuthSession = () => {
  authSession = null;
  persistAuthSession(null);
};

/**
 * Type guard to check if an error is an ApiError
 * 
 * Used to safely access status and message properties from caught errors.
 * Distinguishes API errors from other error types (network errors, etc).
 */
export const isApiError = (error: unknown): error is ApiError => {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "status" in error && "message" in error;
};
/**
 * Build complete URL for API request
 * 
 * Handles:
 * - Absolute URLs (returns as-is)
 * - Relative paths (appends to BASE_URL)
 * - URL normalization (removes trailing/leading slashes)
 * - Validates BASE_URL is configured
 */const buildUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (!BASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL for API requests.");
  }

  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

/**
 * Transform fetch Response into standardized ApiError
 * 
 * Attempts to parse response body as JSON (backend error details).
 * Falls back to plain text if JSON parsing fails.
 * Preserves HTTP status and status text for client handling.
 */
const toApiError = async (response: Response): Promise<ApiError> => {
  let details: unknown = null;

  try {
    details = await response.json();
  } catch {
    details = await response.text();
  }

  return {
    status: response.status,
    message: response.statusText || "Request failed",
    details,
  };
};

/**
 * Make HTTP request to backend API
 * 
 * Automatically:
 * - Sets Content-Type to application/json
 * - Injects Bearer token from auth session (if available)
 * - Converts response status 204 (No Content) to undefined
 * - Transforms errors into standardized ApiError format
 * 
 * Generic type T specifies expected response shape.
 * Throws ApiError on non-OK responses.
 */
export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const session = getAuthSession();
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};
