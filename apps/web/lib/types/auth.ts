export type AuthIdentity = {
  userId: string;
  role: string;
  email: string;
};

export type AuthSession = {
  token: string;
  identity: AuthIdentity;
};

export type AuthSummary = {
  accessToken: string;
  identity: AuthIdentity;
};

export type LoginResponse = {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    departmentId?: string;
  };
};

export type UserProfile = {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  departmentId?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type PasswordResetRequestPayload = {
  email: string;
  /** The base URL of the frontend origin, used by the backend to generate the password reset link sent via email. Captured client-side via window.location.origin. */
  baseUrl?: string;
};

export type PasswordResetConfirmPayload = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};
