"use client";
import { useRef, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { processEdit } from "@/server/voice";
import { normalize } from "@/ai/matching";
import { PendingIndicator } from "@/app/brand/pending-indicator";
import { ar } from "@/lib/i18n";
import { command } from "../notes/command";
import { NumberControl } from "../notes/number-control";
import {
  blockers,
  reviewLine,
  fromSpeech,
  type Line,
  type Draft,
  type Item,
} from "./review-model";
import { LineCard } from "./line-card";
import { VoiceRecorder } from "./recorder";
const t = ar.notes,
  f = ar.flow;
const previewDate = new Intl.DateTimeFormat("ar-EG", {
  timeZone: "Africa/Cairo",
});
type Panel =
  | { kind: "customer" | "add" | "append" | "replace" | "correct" }
  | { kind: "product" | "create"; key: string };
export function ConfirmControl({
  draft,
  onConfirm,
}: {
  draft: Draft;
  onConfirm: () => void;
}) {
  const reason = blockers(draft);
  return (
    <div className="confirm-control">
      {reason && <p id="confirm-blocker">{reason}</p>}
      <button
        disabled={!!reason}
        aria-describedby={reason ? "confirm-blocker" : undefined}
        onClick={onConfirm}
      >
        {t.confirm}
      </button>
    </div>
  );
}
export function Review({
  initial,
  products: catalog,
  customers,
  canConfirm,
}: {
  canConfirm: boolean;
  initial: Draft;
  products: Item[];
  customers: Item[];
}) {
  const [draft, setDraft] = useState(initial),
    [products, setProducts] = useState(catalog);
  const [number, setNumber] = useState<number>();
  const [panel, setPanel] = useState<Panel | null>(null),
    [query, setQuery] = useState(""),
    [working, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [undo, setUndo] = useState<{
    apply: () => void;
    expires: boolean;
  } | null>(null);
  const saved = useRef<{ id: string; updatedAt?: string; draft: Draft } | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const busy = working || navigating;
  useEffect(() => {
    if (!undo?.expires) return;
    const timer = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [undo]);
  function open(next: Panel, value = "") {
    setQuery(value);
    setPanel(next);
    dialog.current?.showModal();
  }
  function close() {
    dialog.current?.close();
    setPanel(null);
  }
  function update(d: Draft) {
    setDraft(d);
    if (!undo?.expires) setUndo(null);
    setMessage("");
  }
  function patch(key: string, p: Partial<Line>) {
    update({
      ...draft,
      lines: draft.lines.map((l) => (l.key === key ? { ...l, ...p } : l)),
    });
  }
  function remove(line: Line, index: number) {
    update({ ...draft, lines: draft.lines.filter((l) => l.key !== line.key) });
    setMessage(f.removed + " · " + line.spokenText);
    setUndo({
      expires: true,
      apply: () =>
        setDraft((current) => {
          const lines = [...current.lines];
          lines.splice(index, 0, line);
          return { ...current, lines };
        }),
    });
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  function choose(key: string, id: string, learn = true) {
    const line = draft.lines.find((l) => l.key === key)!;
    patch(key, { productId: id, level: "GREEN", unmatched: false });
    close();
    if (
      learn &&
      line.spokenText &&
      (line.level !== "GREEN" || line.productId !== id)
    )
      void fetch("/api/products/" + id + "/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: line.spokenText }),
      })
        .then((res) => {
          if (!res.ok) setMessage(f.aliasFailed);
        })
        .catch(() => setMessage(f.aliasFailed));
  }
  function applyEdits(result: Awaited<ReturnType<typeof processEdit>>) {
    let lines = [...draft.lines],
      customerId = draft.customerId;
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
        const line = lines.find((l) => l.key === op.key)!;
        if (op.op === "removeLine") {
          lines = lines.filter((l) => l.key !== op.key);
          changes.push(f.removed + " · " + line.spokenText);
        } else {
          lines = lines.map((l) =>
            l.key === op.key ? { ...l, quantity: op.quantity } : l,
          );
          changes.push(
            (products.find((p) => p.id === line.productId)?.nameAr ||
              line.spokenText) +
              " · " +
              line.quantity +
              " ← " +
              op.quantity,
          );
        }
      }
    }
    close();
    if (!changes.length) {
      setMessage(f.noEdits);
      return;
    }
    update({
      lines,
      customerId,
      transcript: draft.transcript + "\n" + result.transcript,
    });
    setMessage(changes.join("، "));
    setUndo({ expires: false, apply: () => setDraft(draft) });
  }
  function confirm() {
    void run(async () => {
      const fields = {
        customerId: draft.customerId,
        lines: draft.lines.map(
          ({ productId, quantity, remarks, redRemark }) => ({
            productId,
            quantity,
            remarks,
            redRemark,
          }),
        ),
      };
      if (saved.current?.draft !== draft) {
        const record = await command(
          saved.current
            ? {
                action: "edit",
                id: saved.current.id,
                expected: saved.current.updatedAt,
                fields,
              }
            : { action: "create", fields },
        );
        saved.current = { ...record, draft };
      }
      const record = await command({
        action: "confirm",
        id: saved.current.id,
        expected: saved.current.updatedAt,
        number,
      });
      startNavigation(() => router.replace("/notes/" + record.id));
    });
  }
  const list = panel?.kind === "customer" ? customers : products;
  const customer = customers.find((c) => c.id === draft.customerId);
  return (
    <section className="review">
      <header>
        <h1>{t.summary}</h1>
      </header>
      <section className="note-table" aria-labelledby="voice-preview">
        <h2 id="voice-preview">{t.preview}</h2>
        <dl>
          <dt>{ar.notePdf.customer}</dt>
          <dd>{customer?.nameAr ?? t.choose}</dd>
          <dt>{ar.notePdf.number}</dt>
          <dd>
            {canConfirm ? (
              <NumberControl
                value={number}
                onChange={setNumber}
                disabled={busy}
              />
            ) : (
              t.numberPending
            )}
          </dd>
          <dt>{ar.notePdf.date}</dt>
          <dd>{previewDate.format(new Date())}</dd>
        </dl>
        <table>
          <thead>
            <tr>
              {[...ar.notePdf.headings].reverse().map((heading) => (
                <th key={heading} scope="col">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.lines.map((line, index) => (
              <tr key={line.key}>
                <td>{index + 1}</td>
                <td>
                  {products.find((p) => p.id === line.productId)?.nameAr ??
                    line.spokenText}
                </td>
                <td>{line.quantity}</td>
                <td className={line.redRemark ? "red-remark" : undefined}>
                  {line.remarks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <fieldset disabled={busy} className="fields review-fields">
        <button
          className="customer-button"
          onClick={() => open({ kind: "customer" })}
        >
          {t.customer} · {customer?.nameAr ?? t.choose}　{f.change}
        </button>
        {draft.lines.map((line, index) => (
          <LineCard
            key={line.key}
            line={line}
            index={index}
            count={draft.lines.length}
            name={products.find((p) => p.id === line.productId)?.nameAr ?? ""}
            patch={(p) => patch(line.key, p)}
            choose={(id) => choose(line.key, id)}
            search={() => open({ kind: "product", key: line.key })}
            create={() =>
              open({ kind: "create", key: line.key }, line.spokenText)
            }
            remove={() => remove(line, index)}
            move={(direction) => {
              const rows = [...draft.lines];
              [rows[index], rows[index + direction]] = [
                rows[index + direction],
                rows[index],
              ];
              update({ ...draft, lines: rows });
            }}
          />
        ))}
        <div className="choices">
          <button className="secondary" onClick={() => open({ kind: "add" })}>
            {t.addLine}
          </button>
          <button
            className="secondary"
            onClick={() => open({ kind: "append" })}
          >
            {f.addVoice}
          </button>
          <button onClick={() => open({ kind: "correct" })}>
            🎙 {f.editVoice}
          </button>
        </div>
        <details>
          <summary>{f.heard}</summary>
          <p>{draft.transcript}</p>
          <button
            className="secondary"
            onClick={() => {
              if (window.confirm(f.replace)) open({ kind: "replace" });
            }}
          >
            {f.again}
          </button>
        </details>
        <footer className="confirm-bar">
          <div role="status">
            {busy ? <PendingIndicator>{t.waiting}</PendingIndicator> : message}
          </div>
          {undo && (
            <button
              onClick={() => {
                undo.apply();
                setUndo(null);
                setMessage("");
              }}
            >
              {f.undo}
            </button>
          )}
          {canConfirm && <ConfirmControl draft={draft} onConfirm={confirm} />}
        </footer>
      </fieldset>
      <dialog
        ref={dialog}
        aria-labelledby="review-dialog"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setPanel(null);
        }}
      >
        {panel && (
          <fieldset disabled={busy} className="fields">
            <h2 id="review-dialog">
              {
                {
                  customer: t.choose,
                  product: t.chooseProduct,
                  add: t.addLine,
                  create: ar.voice.add,
                  correct: f.editVoice,
                  replace: f.again,
                  append: f.addVoice,
                }[panel.kind]
              }
            </h2>
            {["customer", "product", "add"].includes(panel.kind) && (
              <>
                <label>
                  {ar.search}
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="choices">
                  {list
                    .filter((i) =>
                      [i.nameAr, ...(i.aliases ?? [])].some((n) =>
                        normalize(n).includes(normalize(query)),
                      ),
                    )
                    .map((i) => (
                      <button
                        key={i.id}
                        className="secondary"
                        onClick={() => {
                          if (panel.kind === "customer")
                            update({ ...draft, customerId: i.id });
                          if (panel.kind === "product") choose(panel.key, i.id);
                          if (panel.kind === "add")
                            update({
                              ...draft,
                              lines: [
                                ...draft.lines,
                                {
                                  key: crypto.randomUUID(),
                                  spokenText: "",
                                  productId: i.id,
                                  quantity: 1,
                                  remarks: "",
                                  redRemark: false,
                                  confidence: 1,
                                  level: "GREEN",
                                  unmatched: false,
                                  candidates: [],
                                },
                              ],
                            });
                          close();
                        }}
                      >
                        {i.nameAr}
                      </button>
                    ))}
                </div>
              </>
            )}
            {panel.kind === "create" && (
              <>
                <label>
                  {ar.name}
                  <input
                    maxLength={180}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button
                  disabled={!query.trim() || query.trim().length > 180}
                  onClick={() =>
                    void run(async () => {
                      const nameAr = query.trim();
                      const { id } = await command({
                        action: "catalog",
                        command: {
                          kind: "product",
                          fields: { nameAr, aliases: [] },
                        },
                      });
                      setProducts([...products, { id, nameAr }]);
                      choose(panel.key, id, false);
                    })
                  }
                >
                  {ar.save}
                </button>
                {message && <p role="alert">{message}</p>}
              </>
            )}
            {["append", "replace", "correct"].includes(panel.kind) && (
              <VoiceRecorder
                key={panel.kind}
                label={panel.kind === "correct" ? f.editVoice : undefined}
                correction={
                  panel.kind === "correct"
                    ? { current: draft, apply: applyEdits }
                    : undefined
                }
                onResult={(result) => {
                  const next = fromSpeech(result);
                  update(
                    panel.kind === "append"
                      ? {
                          ...draft,
                          lines: [...draft.lines, ...next.lines],
                          transcript: draft.transcript + "\n" + next.transcript,
                        }
                      : next,
                  );
                  setUndo(null);
                  close();
                }}
              />
            )}
            <button className="secondary" onClick={close}>
              {f.cancel}
            </button>
          </fieldset>
        )}
      </dialog>
    </section>
  );
}
