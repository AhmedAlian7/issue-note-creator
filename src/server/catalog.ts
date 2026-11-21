import { z } from "zod";
import { productInput, customerInput, userInput, id } from "@/lib/inputs";
import { authorize, type Actor } from "./permissions";
import { audit } from "./audit";
import { db } from "./db";
import { hashPin } from "./auth";

const target = z.object({ id: id.optional() });
export const catalogCommand = z
  .discriminatedUnion("kind", [
    target.extend({ kind: z.literal("product"), fields: productInput }),
    target.extend({ kind: z.literal("customer"), fields: customerInput }),
    target.extend({ kind: z.literal("user"), fields: userInput }),
    z.object({
      kind: z.literal("state"),
      entity: z.enum(["product", "customer", "user"]),
      id,
      operation: z.enum(["archive", "review"]),
    }),
  ])
  .refine((c) => c.kind !== "user" || !!c.id || !!c.fields.pin)
  .refine(
    (c) =>
      c.kind !== "state" || c.entity !== "user" || c.operation === "archive",
  );
type Command = z.infer<typeof catalogCommand>;
export async function changeCatalog(actor: Actor, command: Command) {
  const entity = command.kind === "state" ? command.entity : command.kind;
  const action =
    entity === "product"
      ? command.id
        ? "product.manage"
        : "product.add"
      : entity === "user"
        ? "user.manage"
        : "customer.manage";
  authorize(actor, action);
  return db.$transaction(async (tx) => {
    if (entity === "user") {
      const userId = command.id;
      if (userId)
        await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
      const before = userId
        ? await tx.user.findUniqueOrThrow({ where: { id: userId } })
        : undefined;
      if (
        before?.role === "OWNER" ||
        (command.kind === "user" && command.fields.role === "OWNER")
      )
        authorize(actor, "user.owner");
      let after;
      if (command.kind === "user") {
        const { pin, ...fields } = command.fields;
        if (!userId && !pin) throw new Error("Missing PIN");
        const pinHash = pin ? await hashPin(pin) : undefined;
        after = userId
          ? await tx.user.update({
              where: { id: userId },
              data: { ...fields, pinHash },
            })
          : await tx.user.create({ data: { ...fields, pinHash: pinHash! } });
      } else if (command.kind === "state" && command.operation === "archive") {
        after = await tx.user.update({
          where: { id: userId },
          data: { active: false },
        });
      } else throw new Error("Invalid user operation");
      if (before) await tx.session.deleteMany({ where: { userId: after.id } });
      await audit(
        tx,
        actor.id,
        before ? "update" : "create",
        "User",
        after.id,
        before,
        after,
      );
      return after.id;
    }
    if (entity === "product") {
      if (command.id)
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${command.id} FOR UPDATE`;
      const before = command.id
        ? await tx.product.findUniqueOrThrow({ where: { id: command.id } })
        : undefined;
      const flags = {
        createdByKeeper: actor.role === "KEEPER",
        needsReview: actor.role === "KEEPER",
      };
      const after =
        command.kind === "product"
          ? before
            ? await tx.product.update({
                where: { id: before.id },
                data: command.fields,
              })
            : await tx.product.create({ data: { ...command.fields, ...flags } })
          : await tx.product.update({
              where: { id: command.id },
              data:
                command.kind === "state" && command.operation === "review"
                  ? { needsReview: false }
                  : { active: false },
            });
      await audit(
        tx,
        actor.id,
        before ? "update" : "create",
        "Product",
        after.id,
        before,
        after,
      );
      return after.id;
    }
    if (command.id)
      await tx.$queryRaw`SELECT id FROM "Customer" WHERE id=${command.id} FOR UPDATE`;
    const before = command.id
      ? await tx.customer.findUniqueOrThrow({ where: { id: command.id } })
      : undefined;
    const after =
      command.kind === "customer"
        ? before
          ? await tx.customer.update({
              where: { id: before.id },
              data: command.fields,
            })
          : await tx.customer.create({
              data: { ...command.fields, needsReview: true },
            })
        : await tx.customer.update({
            where: { id: command.id },
            data:
              command.kind === "state" && command.operation === "review"
                ? { needsReview: false }
                : { active: false },
          });
    await audit(
      tx,
      actor.id,
      before ? "update" : "create",
      "Customer",
      after.id,
      before,
      after,
    );
    return after.id;
  });
}
