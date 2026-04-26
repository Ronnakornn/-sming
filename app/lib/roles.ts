export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type AppRole = string;

export function isAdminRole(role: string | null | undefined): role is "ADMIN" {
  return role === ROLES.ADMIN;
}
