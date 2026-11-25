import { cookies } from "next/headers";
import { redirectToApp } from "./app-redirect";
import { db } from "./db";
import { digest } from "./auth";
import { allowed, type Action } from "./permissions";
export const cookieName = "__Host-warehouse";
export async function currentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: digest(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, name: true, role: true, active: true } },
    },
  });
  return session && session.expiresAt > new Date() && session.user.active
    ? session.user
    : null;
}
export async function guard(action: Action) {
  const actor = await currentUser();
  if (!actor) return redirectToApp("/login");
  if (!allowed(actor.role, action)) return redirectToApp("/workspace");
  return actor;
}
