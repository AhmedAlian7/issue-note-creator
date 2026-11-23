import { ar } from "@/lib/i18n";
import { PendingIndicator } from "./brand/pending-indicator";

export default function Loading() {
  return (
    <div className="navigation-progress route-progress" role="status">
      <PendingIndicator>{ar.pending.navigation}</PendingIndicator>
    </div>
  );
}
