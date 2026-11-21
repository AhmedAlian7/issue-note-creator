"use client";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ar } from "@/lib/i18n";
import { normalizeArabic } from "@/lib/note-filters";
import { command } from "./command";
const t = ar.notes;
type Choice = { id: string; nameAr: string; active: boolean };
type Product = Choice & { aliases: string[] };
type Line = {
  productId: string;
  quantity: number;
  remarks: string;
  isDestination: boolean;
  key: string;
};
type Fields = { customerId: string; lines: Line[] };
type Props = {
  customers: Choice[];
  products: Product[];
  initial: Fields;
  noteId?: string;
  updatedAt?: string;
  amend?: boolean;
};
export function Editor({
  customers,
  products: catalog,
  initial,
  noteId,
  updatedAt,
  amend,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState(initial),
    [products, setProducts] = useState(catalog);
  const [savedData, setSavedData] = useState(initial);
  const [summary, setSummary] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [query, setQuery] = useState(""),
    [adding, setAdding] = useState(false),
    [newName, setNewName] = useState(""),
    [reason, setReason] = useState("");
  const [replacing, setReplacing] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const currentId = useRef(noteId),
    timestamp = useRef(updatedAt),
    saved = useRef(initial),
    queue = useRef(Promise.resolve());
  const save = useCallback(
    (value: Fields) => {
      const task = queue.current.then(async () => {
        if (amend || !value.customerId || saved.current === value) return;
        setMessage(t.waiting);
        const result = await command({
          action: currentId.current ? "edit" : "create",
          id: currentId.current,
          expected: timestamp.current,
          fields: value,
        });
        if (!currentId.current) {
          currentId.current = result.id;
          window.history.replaceState(null, "", "/notes/" + result.id);
        }
        saved.current = value;
        setSavedData(value);
        timestamp.current = result.updatedAt;
        setMessage(ar.saved);
      });
      queue.current = task.catch(() => {
        setMessage(t.error);
      });
      return task;
    },
    [amend],
  );
  const autosave = useEffectEvent(() => {
    if (
      !amend &&
      !busy &&
      saved.current !== data &&
      data.lines.every(
        (l) =>
          Number.isInteger(l.quantity) &&
          l.quantity > 0 &&
          l.quantity <= 2147483647,
      )
    )
      void save(data).catch(() => {});
  });
  useEffect(() => {
    const timer = setInterval(autosave, 2500);
    return () => clearInterval(timer);
  }, []);
  function changeLine(key: string, patch: Partial<Line>) {
    setData((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    }));
  }
  function select(productId: string) {
    if (replacing) changeLine(replacing, { productId });
    else
      setData((d) => ({
        ...d,
        lines: [
          ...d.lines,
          {
            key: crypto.randomUUID(),
            productId,
            quantity: 1,
            remarks: t.defaultRemarks,
            isDestination: false,
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
  const name = (productId: string) =>
    products.find((p) => p.id === productId)?.nameAr;
  const valid =
    !!data.customerId &&
    data.lines.length > 0 &&
    data.lines.every(
      (l) =>
        l.quantity > 0 &&
        Number.isInteger(l.quantity) &&
        l.quantity <= 2147483647,
    );
  return (
    <main className="desk note-desk">
      <header>
        <p>{ar.appName}</p>
        <h1>{summary ? t.summary : amend ? t.supersede : t.editor}</h1>
      </header>
      <fieldset disabled={busy} className="fields">
        {!summary && (
          <>
            <label>
              {t.customer}
              <select
                value={data.customerId}
                onChange={(e) =>
                  setData({ ...data, customerId: e.target.value })
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
              <section className="line-card" key={line.key}>
                <div className="line-title">
                  <h2>
                    {i + 1}. {name(line.productId)}
                  </h2>
                  <button
                    className="secondary"
                    onClick={() => {
                      setReplacing(line.key);
                      picker.current?.focus();
                    }}
                  >
                    {ar.edit}
                  </button>
                </div>
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
                <label>
                  {t.remarks}
                  <input
                    maxLength={300}
                    value={line.remarks}
                    style={
                      line.isDestination ? { color: "#a62225" } : undefined
                    }
                    onChange={(e) =>
                      changeLine(line.key, {
                        remarks: e.target.value,
                        isDestination:
                          !!e.target.value.trim() &&
                          e.target.value.trim() !== t.defaultRemarks &&
                          line.isDestination,
                      })
                    }
                  />
                </label>
                {(line.isDestination ||
                  (line.remarks.trim() &&
                    line.remarks.trim() !== t.defaultRemarks)) && (
                  <label>
                    {t.textColor}
                    <select
                      aria-label={t.textColor}
                      value={line.isDestination ? "red" : "default"}
                      onChange={(e) =>
                        changeLine(line.key, {
                          isDestination: e.target.value === "red",
                        })
                      }
                    >
                      <option value="default">{t.defaultColor}</option>
                      <option value="red">{t.red}</option>
                    </select>
                  </label>
                )}
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
                      maxLength={180}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={!newName.trim()}
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
                        select(id);
                      })
                    }
                  >
                    {ar.save}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
        <section className="note-table">
          <h2>{t.preview}</h2>
          <p>{customers.find((c) => c.id === data.customerId)?.nameAr}</p>
          <table>
            <thead>
              <tr>
                {[...ar.notePdf.headings].reverse().map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={l.key}>
                  <td>{i + 1}</td>
                  <td>{name(l.productId)}</td>
                  <td>{l.quantity}</td>
                  <td className={l.isDestination ? "destination" : ""}>
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
              disabled={amend && !reason.trim()}
              onClick={() =>
                run(async () => {
                  await save(data);
                  const result = await command(
                    amend
                      ? {
                          action: "supersede",
                          id: noteId,
                          fields: data,
                          reason,
                        }
                      : {
                          action: "confirm",
                          id: currentId.current,
                          expected: timestamp.current,
                        },
                  );
                  router.replace("/notes/" + result.id);
                  router.refresh();
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
          <button
            disabled={!valid}
            onClick={() =>
              run(async () => {
                await save(data);
                setSummary(true);
              })
            }
          >
            {t.summary}
          </button>
        )}
      </fieldset>
      <p role="status">
        {message === ar.saved && savedData !== data ? "" : message}
      </p>
      <a href="/workspace">{ar.back}</a>
    </main>
  );
}
