import { allowed } from "@/server/permissions";
import Link from "@/app/brand/pending-link";
import { guard } from "@/server/session";
import { ar } from "@/lib/i18n";
import { VoiceFlow } from "./flow";
import { noteCatalog } from "@/server/notes";
export default async function VoicePage() {
  const user = await guard("workspace");
  const catalog = await noteCatalog(user);
  return (
    <main className="desk narrow">
      <VoiceFlow
        canConfirm={allowed(user.role, "note.confirm")}
        header={
          <header>
            <Link href="/workspace">{ar.back}</Link>
            <h1>{ar.voice.title}</h1>
          </header>
        }
        userId={user.id}
        {...catalog}
      />
    </main>
  );
}
