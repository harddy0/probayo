import type { AuthSession } from "../types/auth";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  headers?: HeadersInit;
  body?: unknown;
  signal?: AbortSignal;
};

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

const AUTH_STORAGE_KEY = "probayo.auth";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

let authSession: AuthSession | null = null;

const hasWindow = () => typeof window !== "undefined";

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

export const getAuthSession = (): AuthSession | null => {
  if (authSession) {
    return authSession;
  }

  authSession = loadAuthSession();
  return authSession;
};

export const setAuthSession = (session: AuthSession) => {
  authSession = session;
  persistAuthSession(session);
};

export const clearAuthSession = () => {
  authSession = null;
  persistAuthSession(null);
};

export const isApiError = (error: unknown): error is ApiError => {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "status" in error && "message" in error;
};

const buildUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (!BASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL for API requests.");
  }

  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

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
