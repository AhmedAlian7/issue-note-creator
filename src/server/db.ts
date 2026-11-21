import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
export type { Prisma } from "@/generated/prisma/client";

const globalDb = globalThis as typeof globalThis & {
  warehouseDb?: PrismaClient;
};
export const db =
  globalDb.warehouseDb ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
if (process.env.NODE_ENV !== "production") globalDb.warehouseDb = db;
