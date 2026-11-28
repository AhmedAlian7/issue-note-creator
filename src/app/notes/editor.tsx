"use client";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "@/app/brand/pending-link";
import { useRouter } from "next/navigation";
import { PendingIndicator } from "@/app/brand/pending-indicator";
import { ar } from "@/lib/i18n";
import { noteInput } from "@/lib/inputs";
import { normalizeArabic } from "@/lib/note-filters";
import { useOnline } from "../pwa/connectivity";
import { deleteDraft, putDraft } from "../pwa/drafts";
import { SpeechTools } from "../voice/speech-tools";
import {
  blockers,
  type Draft,
  type Item,
  type Line,
} from "../voice/review-model";
import { MatchOptions } from "../voice/match-options";
import { command } from "./command";
import { NumberControl } from "./number-control";
import { RemarkFields } from "./remark-fields";
const t = ar.notes,
  f = ar.flow;
const previewDate = new Intl.DateTimeFormat("ar-EG", {
  timeZone: "Africa/Cairo",
});
type Product = Item & { aliases: string[] };
function noteFields(value: Draft) {
  return {
    customerId: value.customerId,
    lines: value.lines.map(({ productId, quantity, remarks, redRemark }) => ({
      productId,
      quantity,
      remarks,
      redRemark,
    })),
  };
}
type Props = {
  customers: Item[];
  products: Product[];
  initial: Draft;
  noteId?: string;
  updatedAt?: string;
  amend?: boolean;
  voice?: boolean;
  canConfirm?: boolean;
  userId?: string;
  queueId?: string;
  onBack?: () => void;
};
export function Editor({
  customers,
  products: catalog,
  initial,
  noteId,
  updatedAt,
  amend,
  voice,
  canConfirm = true,
  userId,
  queueId,
  onBack,
}: Props) {
  const router = useRouter();
  const online = useOnline();
  const [navigating, startNavigation] = useTransition();
  const [data, setData] = useState(initial),
    [products, setProducts] = useState(catalog);
  const [savedData, setSavedData] = useState(initial);
  const [summary, setSummary] = useState(false),
    [working, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [number, setNumber] = useState<number>();
  const [hasDraftUrl, setHasDraftUrl] = useState(false);
  const busy = working || navigating;
  const [query, setQuery] = useState(""),
    [adding, setAdding] = useState(false),
    [newName, setNewName] = useState(""),
    [reason, setReason] = useState("");
  const [replacing, setReplacing] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ line: Line; index: number }>();
  const picker = useRef<HTMLInputElement>(null);
  const productNameInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const currentId = useRef(noteId),
    timestamp = useRef(updatedAt),
    saved = useRef(noteId && !queueId ? initial : null),
    localId = useRef(queueId),
    queue = useRef(Promise.resolve());
  const save = useCallback(
    (value: Draft, allowDevice = false) => {
      const task = queue.current.then(async () => {
        if (amend || !canConfirm) return;
        if (saved.current === value) {
          setMessage(ar.saved);
          return;
        }
        const fields = noteFields(value);
        const canSaveToServer =
          navigator.onLine &&
          !value.lines.some((l) => l.level === "YELLOW" || l.level === "RED") &&
          noteInput.safeParse(fields).success;
        if (!canSaveToServer) {
          if (!allowDevice || !userId) return;
          const id = (localId.current ??= crypto.randomUUID());
          await putDraft({
            id,
            userId,
            createdAt: Date.now(),
            editor: {
              data: value,
              noteId: currentId.current,
              updatedAt: timestamp.current,
            },
          });
          setSavedData(value);
          setMessage(t.savedOnDevice);
          return;
        }
        setMessage(t.waiting);
        const result = await command({
          action: currentId.current ? "edit" : "create",
          id: currentId.current,
          expected: timestamp.current,
          fields,
        });
        currentId.current = result.id;
        if (
          mounted.current &&
          window.location.pathname !== "/notes/" + result.id
        ) {
          window.history.replaceState(null, "", "/notes/" + result.id);
          setHasDraftUrl(true);
        }
        saved.current = value;
        setSavedData(value);
        timestamp.current = result.updatedAt;
        if (localId.current) {
          await deleteDraft(localId.current);
          localId.current = undefined;
        }
        setMessage(ar.saved);
      });
      queue.current = task.catch(() => {
        setMessage(t.error);
      });
      return task;
    },
    [amend, canConfirm, userId],
  );
  const autosave = useEffectEvent(() => {
    if (
      online &&
      !busy &&
      saved.current !== data &&
      (voice || data !== initial)
    )
      void save(data).catch(() => {});
  });
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(autosave, 2500);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(undefined), 5000);
    return () => clearTimeout(timer);
  }, [removed]);
  function changeLine(key: string, patch: Partial<Line>) {
    setData((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    }));
  }
  function select(productId: string, key = replacing, learn = true) {
    if (key) {
      const line = data.lines.find((l) => l.key === key);
      changeLine(key, { productId, level: line?.level ? "GREEN" : undefined });
      if (
        learn &&
        line?.spokenText &&
        (line.level !== "GREEN" || line.productId !== productId)
      )
        void fetch("/api/products/" + productId + "/aliases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alias: line.spokenText }),
        })
          .then((res) => {
            if (!res.ok) setMessage(f.aliasFailed);
          })
          .catch(() => setMessage(f.aliasFailed));
    } else
      setData((d) => ({
        ...d,
        lines: [
          ...d.lines,
          {
            key: crypto.randomUUID(),
            productId,
            quantity: 1,
            remarks: t.defaultRemarks,
            redRemark: false,
          },
        ],
      }));
    setReplacing(null);
    setQuery("");
    setAdding(false);
  }
  function move(index: number, direction: number) {
    const rows = [...data.lines];
    [rows[index], rows[index + direction]] = [
      rows[index + direction],
      rows[index],
    ];
    setData({ ...data, lines: rows });
  }
  function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    void fn()
      .catch((e) => setMessage(e instanceof Error ? e.message : t.error))
      .finally(() => setBusy(false));
  }
  const search = normalizeArabic(query);
  const matches = products.filter(
    (p) =>
      p.active &&
      [p.nameAr, ...p.aliases].some((v) => normalizeArabic(v).includes(search)),
  );
  const exactMatch = matches.some((p) =>
    [p.nameAr, ...p.aliases].some((v) => normalizeArabic(v) === search),
  );
  const name = (productId: string | null) =>
    products.find((p) => p.id === productId)?.nameAr;
  const blocker = blockers(data);
  const canSaveDraft =
    !!userId || (online && noteInput.safeParse(noteFields(data)).success);
  const Container = voice ? "section" : "main";
  return (
    <Container className={voice ? "note-desk" : "desk note-desk"}>
      <header>
        <p>{ar.appName}</p>
        <h1>{summary ? t.summary : amend ? t.supersede : t.editor}</h1>
        {!online && <p role="status">{ar.pwa.offline}</p>}
      </header>
      <fieldset disabled={busy} className="fields">
        {!summary && (
          <>
            <label>
              {t.customer}
              <select
                value={data.customerId ?? ""}
                onChange={(e) =>
                  setData({ ...data, customerId: e.target.value || null })
                }
              >
                <option value="">{t.choose}</option>
                {customers
                  .filter((c) => c.active || c.id === data.customerId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
              </select>
            </label>
            {data.lines.map((line, i) => (
              <section
                className={
                  line.level
                    ? "line-card review-line " + line.level
                    : "line-card"
                }
                key={line.key}
              >
                <div className="line-title">
                  <h2>
                    {i + 1}. {name(line.productId) ?? line.spokenText}
                  </h2>
                  <button
                    className="secondary"
                    onClick={() => {
                      setReplacing(line.key);
                      setQuery("");
                      setAdding(false);
                      picker.current?.focus();
                    }}
                  >
                    {ar.edit}
                  </button>
                </div>
                <MatchOptions
                  line={line}
                  choose={(id) => select(id, line.key)}
                  create={() => {
                    setReplacing(line.key);
                    setQuery(line.spokenText ?? "");
                    setNewName(line.spokenText ?? "");
                    setAdding(true);
                    requestAnimationFrame(() =>
                      productNameInput.current?.focus(),
                    );
                  }}
                />
                <label>
                  {t.quantity}
                  <span className="stepper">
                    <button
                      aria-label={t.quantity + " +"}
                      onClick={() =>
                        changeLine(line.key, {
                          quantity: Math.min(2147483647, line.quantity + 1),
                        })
                      }
                    >
                      +
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={2147483647}
                      inputMode="numeric"
                      aria-label={t.quantity}
                      value={line.quantity || ""}
                      onChange={(e) =>
                        changeLine(line.key, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                    <button
                      aria-label={t.quantity + " −"}
                      disabled={line.quantity <= 1}
                      onClick={() =>
                        changeLine(line.key, { quantity: line.quantity - 1 })
                      }
                    >
                      −
                    </button>
                  </span>
                </label>
                <RemarkFields
                  remarks={line.remarks}
                  redRemark={line.redRemark}
                  onChange={(patch) => changeLine(line.key, patch)}
                />
                <div className="tools">
                  <button
                    className="secondary"
                    disabled={!i}
                    onClick={() => move(i, -1)}
                  >
                    {t.up}
                  </button>
                  <button
                    className="secondary"
                    disabled={i === data.lines.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    {t.down}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setData({
                        ...data,
                        lines: data.lines.filter((l) => l.key !== line.key),
                      });
                      if (replacing === line.key) setReplacing(null);
                      if (voice) setRemoved({ line, index: i });
                    }}
                  >
                    {t.remove}
                  </button>
                </div>
              </section>
            ))}
            <section className="picker">
              <h2>{replacing ? t.chooseProduct : t.addLine}</h2>
              <label>
                {t.product}
                <input
                  ref={picker}
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setAdding(false);
                  }}
                />
              </label>
              <div className="choices">
                {matches.map((p) => (
                  <button
                    className="secondary"
                    key={p.id}
                    onClick={() => select(p.id)}
                  >
                    {p.nameAr}
                  </button>
                ))}
              </div>
              {search && !exactMatch && !adding && (
                <button
                  onClick={() => {
                    setNewName(query.trim());
                    setAdding(true);
                    requestAnimationFrame(() =>
                      productNameInput.current?.focus(),
                    );
                  }}
                >
                  {t.addNew}
                </button>
              )}
              {adding && (
                <div className="fields">
                  <label>
                    {ar.name}
                    <input
                      ref={productNameInput}
                      maxLength={180}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={!online || !newName.trim()}
                    onClick={() =>
                      run(async () => {
                        const nameAr = newName.trim();
                        const { id } = await command({
                          action: "catalog",
                          command: {
                            kind: "product",
                            fields: { nameAr, aliases: [] },
                          },
                        });
                        setProducts((p) => [
                          ...p,
                          { id, nameAr, active: true, aliases: [] },
                        ]);
                        select(id, replacing, false);
                      })
                    }
                  >
                    {ar.save}
                  </button>
                </div>
              )}
              {replacing && (
                <button
                  className="secondary"
                  onClick={() => {
                    setReplacing(null);
                    setQuery("");
                    setAdding(false);
                  }}
                >
                  {f.cancel}
                </button>
              )}
            </section>
            {voice && (
              <SpeechTools
                draft={data}
                update={(next) => {
                  setData(next);
                  setRemoved(undefined);
                  setReplacing(null);
                  setQuery("");
                  setAdding(false);
                }}
                products={products}
                customers={customers}
                online={online}
              />
            )}
            {removed && (
              <button
                className="secondary"
                onClick={() => {
                  const lines = [...data.lines];
                  lines.splice(removed.index, 0, removed.line);
                  setData({ ...data, lines });
                  setRemoved(undefined);
                }}
              >
                {f.undo} ·{" "}
                {name(removed.line.productId) ?? removed.line.spokenText}
              </button>
            )}
          </>
        )}
        <section className="note-table" aria-labelledby="note-preview">
          <h2 id="note-preview">{t.preview}</h2>
          <dl>
            <dt>{ar.notePdf.customer}</dt>
            <dd>
              {customers.find((c) => c.id === data.customerId)?.nameAr ??
                t.choose}
            </dd>
            <dt>{ar.notePdf.date}</dt>
            <dd suppressHydrationWarning>{previewDate.format(new Date())}</dd>
            {!amend && (
              <>
                <dt>{ar.notePdf.number}</dt>
                <dd>
                  {summary ? (
                    <NumberControl value={number} onChange={setNumber} />
                  ) : (
                    (number ?? t.numberPending)
                  )}
                </dd>
              </>
            )}
          </dl>
          <table>
            <thead>
              <tr>
                {[...ar.notePdf.headings].reverse().map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={l.key}>
                  <td>{i + 1}</td>
                  <td>{name(l.productId) ?? l.spokenText}</td>
                  <td>{l.quantity}</td>
                  <td className={l.redRemark ? "red-remark" : undefined}>
                    {l.remarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {summary && amend && (
          <label>
            {t.reason}
            <input
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
        {summary ? (
          <>
            <button
              disabled={!online || (amend && !reason.trim())}
              onClick={() =>
                run(async () => {
                  await save(data);
                  const result = await command(
                    amend
                      ? {
                          action: "supersede",
                          id: noteId,
                          fields: noteFields(data),
                          reason,
                        }
                      : {
                          action: "confirm",
                          id: currentId.current,
                          expected: timestamp.current,
                          number,
                        },
                  );
                  startNavigation(() => {
                    router.replace("/notes/" + result.id);
                    router.refresh();
                  });
                })
              }
            >
              {amend ? t.supersede : t.confirm}
            </button>
            <button className="secondary" onClick={() => setSummary(false)}>
              {ar.edit}
            </button>
          </>
        ) : (
          (canConfirm || amend) && (
            <>
              {!amend && (
                <button
                  className="secondary"
                  disabled={!canSaveDraft}
                  onClick={() => run(() => save(data, true))}
                >
                  {t.saveDraft}
                </button>
              )}
              {blocker && <p id="review-blocker">{blocker}</p>}
              <button
                disabled={!online || !!blocker}
                aria-describedby={blocker ? "review-blocker" : undefined}
                onClick={() =>
                  run(async () => {
                    await save(data);
                    setSummary(true);
                  })
                }
              >
                {t.summary}
              </button>
            </>
          )
        )}
      </fieldset>
      <p role="status" className={busy ? "navigation-progress" : undefined}>
        {busy || message === t.waiting ? (
          <PendingIndicator>{t.waiting}</PendingIndicator>
        ) : (message === ar.saved || message === t.savedOnDevice) &&
          savedData !== data ? (
          ""
        ) : (
          message
        )}
      </p>
      {onBack && !hasDraftUrl ? (
        <button className="secondary" disabled={busy} onClick={onBack}>
          {ar.back}
        </button>
      ) : (
        <Link href="/workspace">{ar.back}</Link>
      )}
    </Container>
  );
}
