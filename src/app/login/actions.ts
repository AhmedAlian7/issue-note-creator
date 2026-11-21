"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loginInput } from "@/lib/inputs";
import { login, digest, sessionLifetime } from "@/server/auth";
import { cookieName, guard } from "@/server/session";
import { db } from "@/server/db";

export async function signIn(form: FormData) {
  const fields = loginInput.safeParse(Object.fromEntries(form));
  const token = fields.success ? await login(fields.data) : null;
  if (!token) redirect("/login?failed=1");
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: sessionLifetime,
  });
  redirect("/workspace");
}
export async function signOut() {
  await guard("workspace");
  const jar = await cookies();
  await db.session.deleteMany({
    where: { tokenHash: digest(jar.get(cookieName)!.value) },
  });
  jar.delete(cookieName);
  redirect("/login");
}
