import { clearAuthSession, request, setAuthSession } from "./client";
import type { AuthIdentity, AuthSummary, LoginResponse, UserProfile } from "../types/auth";

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

export const logout = () => {
  clearAuthSession();
};

export const fetchProfile = async (): Promise<UserProfile> => {
  return request<UserProfile>("/auth/profile");
};
