import { ar } from "@/lib/i18n";
import { OfflineRecorder } from "./recorder";

export default function OfflinePage() {
  return (
    <main className="desk narrow">
      <h1>{ar.pwa.shortName}</h1>
      <OfflineRecorder />
    </main>
  );
}
