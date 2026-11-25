import { readdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";

const id = "00000000-0000-4000-8000-000000000001";
const base = "src/app/api";
const routes = [
  ["GET", "cron/reports"],
  ["POST", "cron/reports"],
  ["GET", "health"],
  ["POST", "customers/[id]/aliases"],
  ["GET", "notes/[id]/pdf"],
  ["POST", "products/[id]/aliases"],
  ["GET", "reports/export"],
  ["GET", "reports/pdf/[id]"],
  ["GET", "users"],
  ["POST", "voice/edit"],
  ["POST", "voice/parse"],
  ["POST", "warehouse"],
];

test("every API route rejects requests without its credentials", async ({
  request,
  baseURL,
}) => {
  const files = (await readdir(base, { recursive: true }))
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.endsWith("/route.ts"))
    .map((file) => file.replace("/route.ts", ""));
  expect([...new Set(routes.map(([, route]) => route))].sort()).toEqual(
    files.sort(),
  );
  for (const [method, route] of routes) {
    const response = await request.fetch("/api/" + route.replace("[id]", id), {
      method,
      headers: { Origin: baseURL! },
    });
    expect(response.status(), method + " /api/" + route).toBe(401);
    expect(response.headers()["x-request-id"]).toMatch(/^[\da-f-]{36}$/);
  }
});

test("cross-origin writes are rejected before the handler", async ({
  request,
}) => {
  const response = await request.post("/api/warehouse", {
    headers: { Origin: "https://unrelated.example.test" },
    data: { action: "confirm", id },
  });
  expect(response.status()).toBe(403);
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
