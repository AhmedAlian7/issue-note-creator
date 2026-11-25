import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { afterEach, expect, it, vi } from "vitest";
import { redirectToApp } from "@/server/app-redirect";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error("NEXT_REDIRECT:" + url);
  }),
}));

function setHeaders(values: Record<string, string>) {
  vi.mocked(headers).mockResolvedValue(new Headers(values) as never);
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

it("uses APP_BASE_URL when it is public", async () => {
  vi.stubEnv("APP_BASE_URL", "https://italiannotes.netlify.app");
  setHeaders({ host: "localhost:3000" });

  await expect(redirectToApp("/workspace")).rejects.toThrow("NEXT_REDIRECT");
  expect(redirect).toHaveBeenCalledWith(
    "https://italiannotes.netlify.app/workspace",
  );
});

it.each(["", "http://localhost:3000"])(
  "falls back to the request origin when APP_BASE_URL is %s",
  async (base) => {
    vi.stubEnv("APP_BASE_URL", base);
    setHeaders({
      host: "italiannotes.netlify.app",
      "x-forwarded-proto": "https",
    });

    await expect(redirectToApp("/workspace")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(
      "https://italiannotes.netlify.app/workspace",
    );
  },
);
