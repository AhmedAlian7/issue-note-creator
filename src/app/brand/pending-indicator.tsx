import { ar } from "@/lib/i18n";

export function PendingIndicator({
  children = ar.pending.action,
}: {
  children?: React.ReactNode;
}) {
  return <span className="pending-indicator">{children}</span>;
}
