import { z } from "zod";
import { id } from "@/lib/inputs";
import { ar } from "@/lib/i18n";
import { normalize } from "@/ai/matching";
import { currentUser } from "@/server/session";
import { allowed } from "@/server/permissions";
import { learnAlias } from "@/server/voice-alias";
const body = z.strictObject({
  alias: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .refine((s) => !!normalize(s)),
});
export function aliasHandler(kind: "customer" | "product") {
  return async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
  ) {
    const actor = await currentUser();
    if (!actor) return Response.json({ error: ar.login }, { status: 401 });
    if (!allowed(actor.role, "workspace"))
      return Response.json({ error: ar.denied }, { status: 403 });
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return Response.json({ error: ar.invalid }, { status: 415 });
    const input = body.safeParse(await request.json().catch(() => null));
    const path = z.object({ id }).safeParse(await context.params);
    if (!path.success || !input.success)
      return Response.json({ error: ar.invalid }, { status: 400 });
    try {
      const aliases = await learnAlias(
        actor,
        kind,
        path.data.id,
        input.data.alias,
      );
      return aliases
        ? Response.json({ aliases })
        : Response.json({ error: ar.invalid }, { status: 404 });
    } catch (error) {
      if (error instanceof RangeError)
        return Response.json({ error: ar.conflict }, { status: 409 });
      throw error;
    }
  };
}
