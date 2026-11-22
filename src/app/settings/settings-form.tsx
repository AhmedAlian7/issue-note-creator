"use client";
import { useState } from "react";
import { ar } from "@/lib/i18n";
import {
  defaultCompany,
  frequencies,
  type Schedule,
} from "@/lib/report-config";
import { save, testReport } from "./actions";
const t = ar.reports;
export function SettingsForm(props: {
  schedule: Schedule;
  company: typeof defaultCompany;
  start: number;
  limits: { green: number; yellow: number };
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(task: () => Promise<string>) {
    setBusy(true);
    try {
      setMessage(await task());
    } catch {
      setMessage(ar.notes.error);
    } finally {
      setBusy(false);
    }
  }
  function submit(key: string, value: unknown) {
    return run(() => save({ key, value }));
  }
  return (
    <>
      <output role="status" aria-live="polite" className="settings-feedback">
        {message}
      </output>
      <form
        className="fields"
        action={async (f) => {
          const s = { ...props.schedule, skipEmpty: f.has("skipEmpty") };
          for (const k of frequencies) {
            Object.assign(s, {
              [k]: {
                enabled: f.has(k + ".enabled"),
                time: String(f.get(k + ".time")),
                recipients: String(f.get(k + ".recipients"))
                  .split(/[,،;\n]/)
                  .map((v) => v.trim())
                  .filter(Boolean),
                ...(k === "weekly"
                  ? { weekday: Number(f.get("weekday")) }
                  : k === "monthly"
                    ? { monthday: Number(f.get("monthday")) }
                    : {}),
              },
            });
          }
          await submit("reportSchedule", s);
        }}
      >
        <h2>{t.schedules}</h2>
        {frequencies.map((k) => (
          <fieldset key={k} className="report-panel">
            <legend>{t[k]}</legend>
            <label>
              <input
                type="checkbox"
                name={k + ".enabled"}
                defaultChecked={props.schedule[k].enabled}
              />
              {t.enabled}
            </label>
            <label>
              {t.time}
              <input
                type="time"
                name={k + ".time"}
                defaultValue={props.schedule[k].time}
                required
              />
            </label>
            {k === "weekly" && (
              <label>
                {t.weekday}
                <select
                  name="weekday"
                  defaultValue={props.schedule.weekly.weekday}
                >
                  {t.weekdays.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {k === "monthly" && (
              <label>
                {t.monthday}
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  name="monthday"
                  defaultValue={props.schedule.monthly.monthday}
                />
                <small>{t.missingDay}</small>
              </label>
            )}
            <label>
              {t.recipients}
              <input
                dir="ltr"
                name={k + ".recipients"}
                defaultValue={props.schedule[k].recipients.join(", ")}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              className="secondary"
              onClick={() => run(() => testReport(k))}
            >
              {t.test}
            </button>
          </fieldset>
        ))}
        <label>
          <input
            type="checkbox"
            name="skipEmpty"
            defaultChecked={props.schedule.skipEmpty}
          />
          {t.skipEmpty}
        </label>
        <button disabled={busy}>{ar.save}</button>
      </form>
      <form
        className="fields"
        action={(f) => submit("company", Object.fromEntries(f))}
      >
        <h2>{t.company}</h2>
        <p>{t.warning}</p>
        {(["website", "phone", "city"] as const).map((k) => (
          <label key={k}>
            {k === "phone" ? ar.phone : t[k]}
            <input
              name={k}
              required
              maxLength={k === "phone" ? 32 : 80}
              defaultValue={props.company[k]}
            />
          </label>
        ))}
        <button disabled={busy}>{ar.save}</button>
      </form>
      <form
        className="fields"
        action={(f) => submit("numberingStart", Number(f.get("start")))}
      >
        <label>
          {t.start}
          <input
            type="number"
            required
            name="start"
            min="1"
            max="2147483646"
            defaultValue={props.start}
          />
        </label>
        <button disabled={busy}>{ar.save}</button>
      </form>
      <form
        className="fields"
        action={(f) =>
          submit("voiceThresholds", {
            green: Number(f.get("green")),
            yellow: Number(f.get("yellow")),
          })
        }
      >
        {(["green", "yellow"] as const).map((k) => (
          <label key={k}>
            {t[k]}
            <input
              required
              type="number"
              step=".01"
              min=".01"
              max="1"
              name={k}
              defaultValue={props.limits[k]}
            />
          </label>
        ))}
        <button disabled={busy}>{ar.save}</button>
      </form>
    </>
  );
}
