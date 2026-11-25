import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { appUrl, isLoopbackOrigin } from "./app-url";
import { requestOrigin } from "./request-origin";

export async function redirectToApp(path: string): Promise<never> {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured && !isLoopbackOrigin(configured)) redirect(appUrl(path).href);
  const origin = requestOrigin(await headers());
  if (origin) redirect(new URL(path, origin).href);
  redirect(appUrl(path).href);
}
