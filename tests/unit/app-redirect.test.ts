import { redirect } from "next/navigation";
import { afterEach, expect, it, vi } from "vitest";
import { redirectToApp } from "@/server/app-redirect";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

it("sends app redirects to APP_BASE_URL", async () => {
  vi.stubEnv("APP_BASE_URL", "https://italiannotes.netlify.app");

  await redirectToApp("/workspace");
  await redirectToApp("/login?failed=1");

  expect(vi.mocked(redirect).mock.calls).toEqual([
    ["https://italiannotes.netlify.app/workspace"],
    ["https://italiannotes.netlify.app/login?failed=1"],
  ]);
});

it("throws instead of redirecting to localhost when APP_BASE_URL is missing", async () => {
  vi.stubEnv("APP_BASE_URL", "");

  await expect(redirectToApp("/workspace")).rejects.toThrow("APP_BASE_URL");
  expect(redirect).not.toHaveBeenCalled();
});
