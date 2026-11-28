"use client";

import { useRef, useState } from "react";
import type { processEdit } from "@/server/voice";
import { ar } from "@/lib/i18n";
import { fromSpeech, reviewLine, type Draft, type Item } from "./review-model";
import { VoiceRecorder } from "./recorder";

const f = ar.flow;
const labels = { append: f.addVoice, correct: f.editVoice, replace: f.again };
type Mode = keyof typeof labels;

export function SpeechTools({
  draft,
  update,
  products,
  customers,
  online,
}: {
  draft: Draft;
  update: (value: Draft) => void;
  products: Item[];
  customers: Item[];
  online: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [message, setMessage] = useState("");
  const [undo, setUndo] = useState<{ before: Draft; after: Draft }>();
  function open(next: Mode) {
    setMode(next);
    dialog.current?.showModal();
  }
  function close() {
    dialog.current?.close();
    setMode(null);
  }
  function applyEdits(result: Awaited<ReturnType<typeof processEdit>>) {
    let lines = [...draft.lines];
    let customerId = draft.customerId;
    const changes: string[] = [];
    for (const op of result.operations) {
      if (op.op === "changeCustomer") {
        customerId = op.customerId;
        changes.push(
          f.customerChanged +
            " · " +
            customers.find((c) => c.id === customerId)?.nameAr,
        );
      } else if (op.op === "addLine") {
        lines.push(reviewLine(op.line));
        changes.push(f.added + " · " + op.line.spokenText);
      } else {
        const line = lines.find((l) => l.key === op.key);
        if (!line) continue;
        const name =
          products.find((p) => p.id === line.productId)?.nameAr ??
          line.spokenText;
        if (op.op === "removeLine") {
          lines = lines.filter((l) => l.key !== op.key);
          changes.push(f.removed + " · " + name);
        } else {
          lines = lines.map((l) =>
            l.key === op.key ? { ...l, quantity: op.quantity } : l,
          );
          changes.push(name + " · " + line.quantity + " ← " + op.quantity);
        }
      }
    }
    close();
    if (!changes.length) {
      setMessage(f.noEdits);
      return;
    }
    const after = {
      lines,
      customerId,
      transcript: [draft.transcript, result.transcript]
        .filter(Boolean)
        .join("\n"),
    };
    update(after);
    setMessage(changes.join("، "));
    setUndo({ before: draft, after });
  }
  return (
    <>
      <div className="choices">
        <button
          className="secondary"
          disabled={!online}
          onClick={() => open("append")}
        >
          {f.addVoice}
        </button>
        <button
          className="secondary"
          disabled={!online}
          onClick={() => open("correct")}
        >
          {f.editVoice}
        </button>
      </div>
      <details>
        <summary>{f.heard}</summary>
        <p>{draft.transcript}</p>
        <button
          className="secondary"
          disabled={!online}
          onClick={() => {
            if (window.confirm(f.replace)) open("replace");
          }}
        >
          {f.again}
        </button>
      </details>
      {message && <p role="status">{message}</p>}
      {undo?.after === draft && (
        <button
          className="secondary"
          onClick={() => {
            update(undo.before);
            setUndo(undefined);
            setMessage("");
          }}
        >
          {f.undo}
        </button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="speech-tool-heading"
        onCancel={() => setMode(null)}
      >
        {mode && (
          <div className="fields">
            <h2 id="speech-tool-heading">{labels[mode]}</h2>
            <VoiceRecorder
              label={mode === "correct" ? f.editVoice : undefined}
              correction={
                mode === "correct"
                  ? {
                      current: {
                        customerId: draft.customerId,
                        lines: draft.lines.map(
                          ({
                            key,
                            productId,
                            spokenText,
                            quantity,
                            remarks,
                          }) => ({
                            key,
                            productId,
                            spokenText: spokenText ?? "",
                            quantity,
                            remarks,
                          }),
                        ),
                      },
                      apply: applyEdits,
                    }
                  : undefined
              }
              onResult={(result) => {
                const next = fromSpeech(result);
                update(
                  mode === "append"
                    ? {
                        ...draft,
                        lines: [...draft.lines, ...next.lines],
                        transcript: [draft.transcript, next.transcript]
                          .filter(Boolean)
                          .join("\n"),
                      }
                    : next,
                );
                setUndo(undefined);
                setMessage("");
                close();
              }}
            />
            <button className="secondary" onClick={close}>
              {f.cancel}
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
