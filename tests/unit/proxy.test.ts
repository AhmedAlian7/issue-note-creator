import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

afterEach(() => vi.unstubAllEnvs());

function request(origin: string) {
  return new NextRequest("https://italiannotes.netlify.app/login", {
    method: "POST",
    headers: {
      origin,
      host: "italiannotes.netlify.app",
      "x-forwarded-proto": "https",
      "next-action": "test-action",
    },
  });
}

it("accepts same-origin server actions when APP_BASE_URL is stale", () => {
  vi.stubEnv("APP_BASE_URL", "http://localhost:3000");

  const response = proxy(request("https://italiannotes.netlify.app"));

  expect(response.status).toBe(200);
});

it("rejects cross-origin server actions", () => {
  const response = proxy(request("https://unrelated.example.test"));

  expect(response.status).toBe(403);
});
