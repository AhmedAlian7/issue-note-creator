import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { db } from "../src/server/db";
const require = createRequire(import.meta.url);
const database = "notes_test_" + randomUUID().replaceAll("-", "");
const url = new URL(process.env.DATABASE_URL!);
url.pathname = "/" + database;
const dir = await mkdtemp(join(tmpdir(), "note-pdfs-"));
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  PDF_STORAGE_DIR: dir,
};
function run(script: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(Error("Test command exited with " + code)),
    );
  });
}
await db.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
try {
  await run(require.resolve("prisma/build/index.js"), ["migrate", "deploy"]);
  const unit = process.argv[2] === "unit";
  const script = unit
    ? join(require.resolve("vitest/package.json"), "..", "vitest.mjs")
    : require.resolve("@playwright/test/cli");
  await run(script, [unit ? "run" : "test", ...process.argv.slice(3)]);
} finally {
  await db.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`);
  await db.$disconnect();
  await rm(dir, { recursive: true, force: true });
}
