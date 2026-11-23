import Link from "@/app/brand/pending-link";
import { Wordmark } from "./brand/wordmark";
import { ar } from "@/lib/i18n";

export default function Home() {
  return (
    <main className="desk narrow">
      <Wordmark />
      <header>
        <h1>{ar.appName}</h1>
      </header>
      <Link className="home-entry" href="/workspace">
        {ar.firstLogin}
      </Link>
    </main>
  );
}
