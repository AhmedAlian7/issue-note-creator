import { ar } from "@/lib/i18n";
import Link from "@/app/brand/pending-link";

export default function MissingPage() {
  return (
    <main className="desk narrow">
      <h1>{ar.errors.missing}</h1>
      <Link href="/workspace">{ar.workspace}</Link>
    </main>
  );
}
