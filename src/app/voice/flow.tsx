"use client";
import { keeperKey, type EditorDraft } from "../pwa/drafts";
import { useOnline } from "../pwa/connectivity";
import { WaitingDrafts } from "../pwa/waiting-drafts";
import { ar } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { VoiceRecorder } from "./recorder";
import { FirstHelp } from "./help";
import { Editor } from "../notes/editor";
import { fromSpeech, type Item } from "./review-model";
export function VoiceFlow({
  products,
  customers,
  userId,
  children,
  header,
  canConfirm = true,
}: {
  products: (Item & { aliases: string[] })[];
  customers: Item[];
  userId: string;
  header?: React.ReactNode;
  canConfirm?: boolean;
  children?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<
    (EditorDraft & { queueId?: string }) | null
  >(null);
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
      review={(item) => {
        const saved =
          item.editor ?? (item.result && { data: fromSpeech(item.result) });
        if (!saved) return;
        setDraft({ ...saved, queueId: item.id });
        window.scrollTo(0, 0);
      }}
    />
  );
  return (
    <>
      <FirstHelp userId={userId} />
      {!online && !draft && (
        <p className="report-panel" role="status">
          {ar.pwa.offline}
        </p>
      )}
      {draft ? (
        <Editor
          voice
          canConfirm={canConfirm}
          userId={userId}
          queueId={draft.queueId}
          noteId={draft.noteId}
          updatedAt={draft.updatedAt}
          initial={draft.data}
          products={products}
          customers={customers}
          onBack={() => setDraft(null)}
        />
      ) : (
        <>
          {header}
          <VoiceRecorder
            userId={canConfirm ? userId : undefined}
            onResult={(r) => {
              setDraft({ data: fromSpeech(r) });
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
