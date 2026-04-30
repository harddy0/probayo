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
