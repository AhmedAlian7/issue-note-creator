import { ar } from "@/lib/i18n";
import { signIn } from "./actions";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ failed?: string }>;
}) {
  return (
    <main className="desk narrow">
      <header>
        <p>{ar.appName}</p>
        <h1>{ar.login}</h1>
      </header>
      <form action={signIn} className="fields">
        <label>
          {ar.phone}
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            dir="ltr"
          />
        </label>
        <label>
          {ar.pin}
          <input
            type="password"
            inputMode="numeric"
            minLength={4}
            maxLength={6}
            name="pin"
            required
            autoComplete="current-password"
            dir="ltr"
          />
        </label>
        {(await searchParams).failed === "1" && (
          <p role="alert">{ar.loginError}</p>
        )}
        <button>{ar.login}</button>
      </form>
    </main>
  );
}
