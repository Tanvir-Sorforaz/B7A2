import type { UserProfile, UserRole } from "../../types/user";

export type AuthError = {
  statusCode: number;
  message: string;
  errors: unknown;
};

export type SignupInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
};

export type LoginInput = {
  email?: string;
  password?: string;
};

export type AuthTokenResponse = {
  token: string;
  user: UserProfile;
};
