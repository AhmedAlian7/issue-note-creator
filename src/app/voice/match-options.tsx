import { ar } from "@/lib/i18n";
import type { Line } from "./review-model";

const f = ar.flow;
export function MatchOptions({
  line,
  choose,
  create,
}: {
  line: Line;
  choose: (id: string) => void;
  create: () => void;
}) {
  if (!line.level) return null;
  return (
    <>
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
            {f.heard} · {line.spokenText}
          </p>
          <div className="choices">
            {line.candidates?.slice(0, 3).map((c) => (
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
    </>
  );
}
