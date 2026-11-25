"use server";
import { cookies } from "next/headers";
import { redirectToApp } from "@/server/app-redirect";
import { loginInput, username } from "@/lib/inputs";
import { login, digest, sessionLifetime } from "@/server/auth";
import { cookieName, guard } from "@/server/session";
import { db } from "@/server/db";

const sessionCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
} as const;

export async function identify(form: FormData) {
  const parsed = username.safeParse(form.get("username"));
  if (!parsed.success) return redirectToApp("/login?failed=1");
  return redirectToApp("/login?username=" + encodeURIComponent(parsed.data));
}

export async function signIn(enroll: boolean, form: FormData) {
  const fields = loginInput.safeParse({
    username: form.get("username"),
    pin: form.get("pin"),
  });
  const token = fields.success ? await login(fields.data, enroll) : null;
  if (!token)
    return redirectToApp(
      "/login?failed=1" +
        (fields.success
          ? "&username=" + encodeURIComponent(fields.data.username)
          : ""),
    );
  (await cookies()).set(cookieName, token, {
    ...sessionCookie,
    maxAge: sessionLifetime,
  });
  return redirectToApp("/workspace");
}
export async function signOut() {
  await guard("workspace");
  const jar = await cookies();
  await db.session.deleteMany({
    where: { tokenHash: digest(jar.get(cookieName)!.value) },
  });
  jar.set(cookieName, "", { ...sessionCookie, maxAge: 0 });
  return redirectToApp("/login");
}
