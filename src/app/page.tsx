import Link from "next/link";
import { ar } from "@/lib/i18n";

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="text-3xl leading-relaxed font-semibold sm:text-4xl">
        {ar.appName}
      </h1>
      <Link className="home-entry" href="/workspace">
        {ar.firstLogin}
      </Link>
    </main>
  );
}
