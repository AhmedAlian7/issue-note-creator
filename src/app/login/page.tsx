import { ar } from "@/lib/i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import { username } from "@/lib/inputs";
import { db } from "@/server/db";
import { currentUser } from "@/server/session";
import { identify, signIn } from "./actions";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ failed?: string; username?: string }>;
}) {
  if (await currentUser()) redirect("/workspace");
  const query = await searchParams;
  const handle = username.safeParse(query.username);
  const user = handle.success
    ? await db.user.findUnique({
        where: { username: handle.data },
        select: { pinHash: true, active: true },
      })
    : null;
  const enroll = user?.active === true && user.pinHash === null;
  return (
    <main className="desk narrow">
      <header>
        <p>{ar.appName}</p>
        <h1>{ar.login}</h1>
      </header>
      <form
        action={handle.success ? signIn.bind(null, enroll) : identify}
        className="fields"
      >
        <label>
          {ar.username}
          <input
            name="username"
            maxLength={80}
            autoComplete="username"
            defaultValue={handle.data}
            readOnly={handle.success}
            required
            dir="ltr"
          />
        </label>
        {handle.success && (
          <label>
            {enroll ? ar.loginSetPin : ar.pin}
            <input
              type="password"
              inputMode="numeric"
              minLength={4}
              maxLength={6}
              name="pin"
              required
              autoComplete={enroll ? "new-password" : "current-password"}
              dir="ltr"
            />
          </label>
        )}
        {query.failed === "1" && <p role="alert">{ar.loginError}</p>}
        <button>{handle.success ? ar.login : ar.loginContinue}</button>
        {handle.success && <Link href="/login">{ar.loginChangeUsername}</Link>}
      </form>
    </main>
  );
}
