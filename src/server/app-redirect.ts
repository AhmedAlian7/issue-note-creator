import { redirect } from "next/navigation";
import { appUrl } from "./app-url";

export async function redirectToApp(path: string): Promise<never> {
  redirect(appUrl(path).href);
}
