import { ar } from "@/lib/i18n";
import { listUsers } from "@/server/catalog-list";
import { currentUser } from "@/server/session";
import { allowed } from "@/server/permissions";
import { z } from "zod";

export async function GET(request: Request) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: ar.login }, { status: 401 });
  if (!allowed(actor.role, "user.manage"))
    return Response.json({ error: ar.denied }, { status: 403 });
  const query = z
    .strictObject({ q: z.string().trim().max(180).optional() })
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success)
    return Response.json({ error: ar.invalid }, { status: 400 });
  return Response.json(await listUsers(actor, query.data.q));
}
