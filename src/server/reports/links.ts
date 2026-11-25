import { createHmac, timingSafeEqual } from "node:crypto";
import { ar } from "@/lib/i18n";
import { appUrl } from "../app-url";
export const lifetime = 7 * 86400;
function signature(id: string, expires: number) {
  const key = process.env.SESSION_SECRET;
  if (!key) throw Error(ar.reports.missingSecret);
  return createHmac("sha256", key)
    .update("report-pdf:v1:" + id + ":" + expires)
    .digest("hex");
}
export function signedPdf(id: string, now = new Date()) {
  const expires = Math.floor(+now / 1000) + lifetime;
  return appUrl(
    "/api/reports/pdf/" +
      id +
      "?" +
      new URLSearchParams({
        expires: String(expires),
        token: signature(id, expires),
      }),
  ).href;
}
export function validPdf(
  id: string,
  expires: number,
  token: string,
  now = new Date(),
) {
  const time = Math.floor(+now / 1000);
  return (
    !!process.env.SESSION_SECRET &&
    expires > time &&
    expires <= time + lifetime &&
    /^[0-9a-f]{64}$/.test(token) &&
    timingSafeEqual(
      Buffer.from(signature(id, expires), "hex"),
      Buffer.from(token, "hex"),
    )
  );
}
