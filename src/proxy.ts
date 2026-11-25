import { NextResponse, type NextRequest } from "next/server";
import { ar } from "@/lib/i18n";
import { requestOrigin } from "@/server/request-origin";

const development = process.env.NODE_ENV === "development";

export function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'" + (development ? " ws: wss:" : ""),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  headers.set("Content-Security-Policy", policy);
  const path = request.nextUrl.pathname;
  const api = path.startsWith("/api/");
  const bearerOnly = path === "/api/cron/reports";
  const safe = ["GET", "HEAD", "OPTIONS"].includes(request.method);
  const origin = request.headers.get("origin");
  const expected = requestOrigin(request.headers) ?? request.nextUrl.origin;
  const sameOrigin = origin === expected;
  const action = request.headers.has("next-action");
  const response =
    (api || action) && !safe && !bearerOnly && !sameOrigin
      ? NextResponse.json({ error: ar.denied }, { status: 403 })
      : NextResponse.next({ request: { headers } });
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("Content-Security-Policy", policy);
  if (api) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|sw\\.js|icons/|manifest\\.webmanifest).*)",
  ],
};
