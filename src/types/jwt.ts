import type { UserRole } from "./user";

export type JwtUserPayload = {
  id: number;
  name: string;
  role: UserRole;
};
