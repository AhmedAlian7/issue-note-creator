import { timingSafeEqual } from "node:crypto";

export function cronSecretConfigured() {
  return Boolean(process.env.CRON_SECRET);
}

export function authorizedCron(headers: Headers) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const value = headers.get("authorization") ?? "";
  const expected = "Bearer " + secret;
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
