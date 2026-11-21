import Link from "next/link";
import { guard } from "@/server/session";
import { ar } from "@/lib/i18n";
import { VoiceRecorder } from "./recorder";
export default async function VoicePage() {
  await guard("workspace");
  return (
    <main className="desk narrow">
      <Link href="/workspace">{ar.back}</Link>
      <header>
        <h1>{ar.voice.title}</h1>
      </header>
      <VoiceRecorder />
    </main>
  );
}
