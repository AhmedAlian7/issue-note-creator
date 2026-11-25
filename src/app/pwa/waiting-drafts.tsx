"use client";

import { useEffect, useRef, useState } from "react";
import type { VoiceResult } from "@/ai/pipeline";
import { ar } from "@/lib/i18n";
import { useOnline } from "./connectivity";
import {
  deleteDraft,
  listDrafts,
  putDraft,
  queueEvent,
  sendVoice,
  type QueuedDraft,
} from "./drafts";

const t = ar.pwa;
const time = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "short",
  timeStyle: "short",
});

export function WaitingDrafts({
  userId,
  review,
}: {
  userId: string;
  review?: (result: VoiceResult, id: string) => void;
}) {
  const online = useOnline();
  const [items, setItems] = useState<QueuedDraft[]>([]);
  const [sending, setSending] = useState<string>();
  const [failed, setFailed] = useState(false);
  const processing = useRef(false);
  const canSend = !!review;

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      void listDrafts(userId)
        .then((rows) => {
          if (mounted) setItems(rows);
        })
        .catch(() => {
          if (mounted) setFailed(true);
        });
    };
    const sync = async () => {
      if (!mounted || !canSend || !navigator.onLine || processing.current)
        return;
      processing.current = true;
      const drain = async () => {
        for (const item of await listDrafts(userId)) {
          if (!mounted || !navigator.onLine) break;
          if (!item.input || item.result || item.error) continue;
          setSending(item.id);
          const response = await sendVoice(item.input, userId, item.id);
          if (response.ok) {
            const result: VoiceResult = await response.json();
            // The server has the transcript and the raw recording can be removed.
            await putDraft({ ...item, result, input: undefined });
          } else if ([400, 413, 415, 422].includes(response.status)) {
            await putDraft({ ...item, error: ar.voice.failed });
          } else {
            break;
          }
        }
      };
      try {
        if (navigator.locks)
          await navigator.locks.request(
            "warehouse-drafts-" + userId,
            { ifAvailable: true },
            (lock) => (lock ? drain() : undefined),
          );
        else await drain();
      } catch {
        // A failed connection leaves the original recording or text in IndexedDB.
      } finally {
        processing.current = false;
        if (mounted) setSending(undefined);
      }
    };
    const update = () => {
      refresh();
      void sync();
    };
    update();
    window.addEventListener(queueEvent, update);
    const timer = window.setInterval(update, 15_000);
    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener(queueEvent, update);
    };
  }, [userId, canSend, online]);

  if (!items.length && !failed && online) return null;
  return (
    <section className="report-panel" aria-label={t.waiting}>
      <h2>{t.waiting}</h2>
      {failed && <p role="alert">{t.storageError}</p>}
      {items.length === 0 && <p>{ar.empty}</p>}
      <ul>
        {items.map((item) => (
          <li className="tools" key={item.id}>
            <span>
              {typeof item.input === "string"
                ? item.input.slice(0, 60)
                : item.result
                  ? item.result.transcript.slice(0, 60)
                  : t.recording}{" "}
              · {time.format(item.createdAt)}
            </span>
            <span role="status">
              {item.error ??
                (item.result
                  ? t.ready
                  : sending === item.id
                    ? t.sending
                    : t.queued)}
            </span>
            {item.result && review && (
              <button onClick={() => review(item.result!, item.id)}>
                {t.review}
              </button>
            )}
            {item.error && (
              <button
                onClick={() =>
                  void putDraft({ ...item, error: undefined }).catch(() =>
                    setFailed(true),
                  )
                }
              >
                {t.retry}
              </button>
            )}
            <button
              className="secondary"
              disabled={sending === item.id}
              onClick={() =>
                void deleteDraft(item.id).catch(() => setFailed(true))
              }
            >
              {ar.notes.remove}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
