export type UserRole = "contributor" | "maintainer";

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};
