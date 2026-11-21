import type { Role } from "@/generated/prisma/enums";
export type Actor = { id: string; role: Role };
const grants = {
  workspace: ["ADMIN", "KEEPER"],
  "product.add": ["KEEPER", "ADMIN"],
  "product.manage": ["ADMIN"],
  "customer.manage": ["ADMIN"],
  "user.manage": ["ADMIN"],
  "user.owner": [],
  "user.screen": [],
  "note.create": ["KEEPER"],
  "note.edit": ["KEEPER"],
  "note.confirm": ["KEEPER"],
  "note.void": ["ADMIN"],
  "note.supersede": [],
  "settings.manage": [],
  "audit.read": [],
} satisfies Record<string, Role[]>;
export type Action = keyof typeof grants;
export class Denied extends Error {}
export function allowed(role: Role, action: Action) {
  return role === "OWNER" || (grants[action] as Role[]).includes(role);
}
export function authorize(actor: Actor, action: Action) {
  if (!allowed(actor.role, action)) throw new Denied();
  return actor;
}
