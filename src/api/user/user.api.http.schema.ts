import { User } from "@/api/user/user.api.ts";
import { z } from "zod";

// HTTP response schema for User
export const user$ = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.enum(["active", "invited", "archived"]),
  avatar_url: z.string().nullable(),
  last_logged_in: z.string().nullable(),
});

export type User$ = z.infer<typeof user$>;

export function userFromHttp(data: User$): User {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status,
    avatarUrl: data.avatar_url,
    lastLoggedIn: data.last_logged_in
      ? new Date(data.last_logged_in)
      : undefined,
  };
}

// HTTP response schema for PaginatedResponse<User>
export const paginatedUsers$ = z.object({
  data: z.array(user$),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type PaginatedUsers$ = z.infer<typeof paginatedUsers$>;

// Invite user request schema
export const inviteUserPayload$ = z.object({
  email: z.string().email(),
  role: z.string(),
  workspace_id: z.string(),
});

export type InviteUserPayload$ = z.infer<typeof inviteUserPayload$>;

// Update user request schema
export const updateUserPayload$ = z.object({
  role: z.string(),
});

export type UpdateUserPayload$ = z.infer<typeof updateUserPayload$>;
