import { describe, it, expect } from "vitest";
import { allowed, type Action } from "@/server/permissions";
const expected = {
  workspace: [true, true, true],
  "product.add": [true, true, true],
  "product.manage": [true, false, true],
  "customer.manage": [true, false, true],
  "user.manage": [true, false, true],
  "user.owner": [false, false, true],
  "user.screen": [false, false, true],
  "note.create": [false, true, true],
  "note.edit": [false, true, true],
  "note.confirm": [false, true, true],
  "note.void": [true, false, true],
  "note.supersede": [false, false, true],
  "settings.manage": [false, false, true],
  "audit.read": [false, false, true],
} satisfies Record<Action, boolean[]>;
describe.each(["ADMIN", "KEEPER", "OWNER"] as const)(
  "%s permissions",
  (role) => {
    it.each(Object.keys(expected) as Action[])("%s", (action) => {
      expect(allowed(role, action)).toBe(
        expected[action][["ADMIN", "KEEPER", "OWNER"].indexOf(role)],
      );
    });
  },
);
