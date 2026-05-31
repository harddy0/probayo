/**
 * Authentication API Module
 * 
 * High-level auth operations that use the HTTP client.
 * Handles login flow, logout, and profile fetching.
 * All auth state is managed through the client module's session storage.
 */

import { clearAuthSession, request, setAuthSession } from "./client";
import type {
  AuthIdentity,
  AuthSummary,
  ChangePasswordPayload,
  LoginResponse,
  PasswordResetConfirmPayload,
  PasswordResetRequestPayload,
  UserProfile,
} from "../types/auth";

/**
 * Login user with email and password
 * 
 * Process:
 * 1. Send credentials to /auth/login endpoint
 * 2. Extract token and user data from response
 * 3. Create identity object with userId, role, email
 * 4. Store session (token + identity) in client storage
 * 5. Return auth summary to caller
 * 
 * @param email - User email address
 * @param password - User password
 * @returns AuthSummary with access token and user identity
 * @throws ApiError if login fails
 */
export const login = async (email: string, password: string): Promise<AuthSummary> => {
  const payload = { email, password };
  const data = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });

  const identity: AuthIdentity = {
    userId: data.user.id,
    role: data.user.role,
    email: data.user.email,
  };

  setAuthSession({ token: data.access_token, identity });

  return {
    accessToken: data.access_token,
    identity,
  };
};

/**
 * Clear user session (logout)
 * 
 * Removes auth token and identity from storage.
 * After this, getAuthSession() returns null and requests are unauthenticated.
 */
export const logout = () => {
  clearAuthSession();
};

/**
 * Fetch authenticated user's profile
 * 
 * Requires active session (Bearer token).
 * Returns full user profile with identity fields and account data.
 * 
 * @returns UserProfile with user data (id, email, role, department, etc)
 * @throws ApiError if request fails or user not authenticated
 */
export const fetchProfile = async (): Promise<UserProfile> => {
  return request<UserProfile>("/auth/profile");
};

/**
 * Change the current user's password
 * 
 * Requires the current password for verification.
 * Requires an active session (Bearer token).
 * 
 * @param payload - Object containing currentPassword and newPassword
 * @throws ApiError if current password is wrong or request fails
 */
export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<void> => {
  await request("/auth/change-password", {
    method: "POST",
    body: payload,
  });
};

/**
 * Request a password reset email
 *
 * Sends a password reset request to the backend.
 * The backend handles email delivery with the reset token/link.
 * No auth required.
 *
 * @param payload - Object containing the user's email
 * @throws ApiError if the request fails
 */
export const requestPasswordReset = async (
  payload: PasswordResetRequestPayload,
): Promise<void> => {
  await request("/auth/password-reset/request", {
    method: "POST",
    body: payload,
  });
};

/**
 * Confirm a password reset with token and new password
 *
 * Submits the reset token (from email link) and the new password.
 * No auth required.
 *
 * @param payload - Object containing the token and new password
 * @throws ApiError if token is invalid/expired or passwords validation fails
 */
export const confirmPasswordReset = async (
  payload: PasswordResetConfirmPayload,
): Promise<void> => {
  await request("/auth/password-reset/confirm", {
    method: "POST",
    body: {
      token: payload.token,
      newPassword: payload.newPassword,
      confirmPassword: payload.confirmPassword,
    },
  });
};
