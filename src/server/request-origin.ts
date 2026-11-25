import { isLoopbackOrigin } from "./app-url";

export function requestOrigin(headers: Headers): string | null {
  const host = (headers.get("x-forwarded-host") ?? headers.get("host"))
    ?.split(",")[0]
    ?.trim();
  if (!host) return null;
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : isLoopbackOrigin(host)
        ? "http"
        : "https";
  return `${protocol}://${host}`;
}
