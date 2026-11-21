import type { Prisma } from "./db";

function snapshot(
  value: object | undefined,
): Prisma.InputJsonValue | undefined {
  return (
    value &&
    JSON.parse(
      JSON.stringify(value, (key, field) =>
        ["pin", "pinHash", "tokenHash"].includes(key) ? undefined : field,
      ),
    )
  );
}
export function audit(
  tx: Prisma.TransactionClient,
  userId: string | null,
  action: string,
  entity: string,
  entityId: string,
  before?: object,
  after?: object,
) {
  return tx.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      before: snapshot(before),
      after: snapshot(after),
    },
  });
}
