import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { appUrl } from "./app-url";

export async function redirectToApp(path: string): Promise<never> {
  const host = (await headers()).get("host") ?? "";
  // A locally issued session cookie belongs to the local site.
  if (
    !process.env.APP_BASE_URL?.trim() ||
    /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)
  )
    redirect(path);
  redirect(appUrl(path).href);
}
