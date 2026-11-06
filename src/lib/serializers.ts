import type { User } from "@prisma/client";

/** Strip credentials before any user object leaves the server. */
export function toSafeUser(user: User & { group?: { id: string; name: string; type: string; status: string } | null }) {
  const { passwordHash: _stripped, ...safe } = user;
  return safe;
}
