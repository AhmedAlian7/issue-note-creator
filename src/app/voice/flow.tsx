"use client";
import { deleteDraft, keeperKey } from "../pwa/drafts";
import { useOnline } from "../pwa/connectivity";
import { WaitingDrafts } from "../pwa/waiting-drafts";
import { ar } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { VoiceRecorder } from "./recorder";
import { FirstHelp } from "./help";
import { Review } from "./review";
import { fromSpeech, type Item, type Draft } from "./review-model";
export function VoiceFlow({
  products,
  customers,
  userId,
  children,
  header,
  canConfirm = true,
}: {
  products: Item[];
  customers: Item[];
  userId: string;
  header?: React.ReactNode;
  canConfirm?: boolean;
  children?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [queuedId, setQueuedId] = useState<string>();
  const online = useOnline();
  useEffect(() => {
    if (!canConfirm) return;
    try {
      localStorage.setItem(keeperKey, userId);
    } catch {}
  }, [canConfirm, userId]);

  const waiting = canConfirm && (
    <WaitingDrafts
      userId={userId}
      review={(result, id) => {
        setQueuedId(id);
        setDraft(fromSpeech(result));
        window.scrollTo(0, 0);
      }}
    />
  );
  return (
    <>
      <FirstHelp userId={userId} />
      {!online && (
        <p className="report-panel" role="status">
          {ar.pwa.offline}
        </p>
      )}
      {draft ? (
        <>
          {queuedId && (
            <button
              className="secondary"
              onClick={() => {
                setDraft(null);
                setQueuedId(undefined);
              }}
            >
              {ar.back}
            </button>
          )}
          <Review
            canConfirm={canConfirm}
            onConfirmed={queuedId ? () => deleteDraft(queuedId) : undefined}
            initial={draft}
            products={products}
            customers={customers}
          />
        </>
      ) : (
        <>
          {header}
          <VoiceRecorder
            userId={canConfirm ? userId : undefined}
            onResult={(r) => {
              setDraft(fromSpeech(r));
              window.scrollTo(0, 0);
            }}
          />
          {children}
        </>
      )}
      <div hidden={!!draft}>{waiting}</div>
    </>
  );
}
