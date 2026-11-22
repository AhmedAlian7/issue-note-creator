import { ar } from "@/lib/i18n";
import type { Line } from "./review-model";
const t = ar.notes,
  f = ar.flow;
type Props = {
  line: Line;
  index: number;
  count: number;
  name: string;
  patch: (p: Partial<Line>) => void;
  choose: (id: string) => void;
  search: () => void;
  create: () => void;
  remove: () => void;
  move: (n: number) => void;
};
export function LineCard({
  line,
  index,
  count,
  name,
  patch,
  choose,
  search,
  create,
  remove,
  move,
}: Props) {
  return (
    <section
      className={"line-card review-line " + line.level}
      aria-label={f.line + " " + (index + 1)}
    >
      <div className="line-title">
        <h2>
          {index + 1}. {name || line.spokenText}
        </h2>
        <button className="secondary" onClick={search}>
          {f.change}
        </button>
      </div>
      <strong className="match-state">
        {line.level === "GREEN"
          ? f.green
          : line.level === "RED"
            ? f.red
            : f.yellow}
      </strong>
      {line.level === "YELLOW" && (
        <div>
          <p>
            {ar.flow.heard} · {line.spokenText}
          </p>
          <div className="choices">
            {line.candidates.slice(0, 3).map((c) => (
              <button
                key={c.id}
                className="secondary"
                onClick={() => choose(c.id)}
              >
                {c.nameAr}
              </button>
            ))}
          </div>
        </div>
      )}
      {line.level === "RED" && <button onClick={create}>{ar.voice.add}</button>}
      <div>
        <span>{t.quantity}</span>
        <div className="stepper">
          <button
            aria-label={t.quantity + " +"}
            disabled={line.quantity >= 2147483647}
            onClick={() => patch({ quantity: line.quantity + 1 })}
          >
            +
          </button>
          <input
            aria-label={t.quantity}
            type="number"
            inputMode="numeric"
            min="1"
            max="2147483647"
            value={line.quantity || ""}
            onChange={(e) => patch({ quantity: Number(e.target.value) })}
          />
          <button
            aria-label={t.quantity + " −"}
            disabled={line.quantity <= 1}
            onClick={() => patch({ quantity: line.quantity - 1 })}
          >
            −
          </button>
        </div>
      </div>
      <label>
        {t.remarks}
        <input
          value={line.remarks}
          maxLength={300}
          onChange={(e) => patch({ remarks: e.target.value })}
        />
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={line.isDestination}
          onChange={(e) => patch({ isDestination: e.target.checked })}
        />
        {f.destination}
      </label>
      <div className="tools">
        <button
          className="secondary"
          disabled={!index}
          onClick={() => move(-1)}
        >
          {t.up}
        </button>
        <button
          className="secondary"
          disabled={index === count - 1}
          onClick={() => move(1)}
        >
          {t.down}
        </button>
        <button className="secondary" onClick={remove}>
          {t.remove}
        </button>
      </div>
    </section>
  );
}
