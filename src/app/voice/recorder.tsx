"use client";
import type { EditContext } from "@/ai/edits";
import type { processEdit } from "@/server/voice";
import { useEffect, useRef, useState } from "react";
import { PendingIndicator } from "@/app/brand/pending-indicator";
import { ar } from "@/lib/i18n";
import type { VoiceResult } from "@/ai/pipeline";
import { capture } from "./capture";

const labels = ar.voice;
type Props = {
  onResult: (result: VoiceResult) => void;
  label?: string;
  correction?: {
    current: EditContext;
    apply: (result: Awaited<ReturnType<typeof processEdit>>) => void;
  };
};
export function VoiceRecorder({ onResult, label, correction }: Props) {
  const [state, setState] = useState<
    "idle" | "opening" | "recording" | "paused" | "busy"
  >("idle");
  const [meter, setMeter] = useState({ ms: 0, level: 0 });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const active = useRef<Awaited<ReturnType<typeof capture>> | null>(null);
  const mounted = useRef(false);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.dispose();
    };
  }, []);
  function fail(message: string) {
    if (!mounted.current) return;
    setTyping(true);
    setError(message);
    setState("idle");
    requestAnimationFrame(() => box.current?.focus());
  }
  async function submit(input: Blob | string) {
    setState("busy");
    setError("");

    try {
      const typed = typeof input === "string";
      const form = new FormData();
      if (correction) {
        form.set("current", JSON.stringify(correction.current));
        form.set("input", input);
      }
      const response = await fetch(
        correction ? "/api/voice/edit" : "/api/voice/parse",
        {
          method: "POST",
          headers: correction
            ? undefined
            : { "Content-Type": typed ? "application/json" : input.type },
          body: correction
            ? form
            : typed
              ? JSON.stringify({ transcript: input })
              : input,
          signal: AbortSignal.timeout(115000),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (
          !typed &&
          response.status === 422 &&
          typeof data.transcript === "string"
        )
          setText(data.transcript);
        fail(data.error ?? labels.failed);
        return;
      }
      if (mounted.current) {
        if (correction) correction.apply(data);
        else onResult(data);
        setText(data.transcript);
        setState("idle");
      }
    } catch {
      fail(labels.failed);
    }
  }
  async function start() {
    setState("opening");
    setError("");

    setMeter({ ms: 0, level: 0 });
    try {
      const recording = await capture(
        (ms, level) => setMeter({ ms, level }),
        (blob) => {
          active.current = null;
          setMeter((m) => ({ ...m, level: 0 }));
          void submit(blob);
        },
        () => fail(labels.unavailable),
      );
      if (!mounted.current) {
        recording.dispose();
        return;
      }
      active.current = recording;
      setState("recording");
    } catch (err) {
      fail(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? labels.permission
          : labels.unavailable,
      );
    }
  }
  const recording = state === "recording" || state === "paused";
  const seconds = Math.floor(meter.ms / 1000);
  return (
    <div className="fields">
      <button
        className={label ? "voice-small" : "voice-mic"}
        disabled={!recording && state !== "idle"}
        onClick={() => (recording ? active.current?.stop() : void start())}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="32"
          height="32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="9" y="2" width="6" height="13" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
        </svg>
        {recording ? labels.stop : (label ?? labels.start)}
      </button>
      {recording && (
        <>
          {" "}
          <div>
            {labels.time}{" "}
            <time dir="ltr">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </time>{" "}
            · {labels.limit}
          </div>
          <label>
            {labels.level}
            <meter min={0} max={1} value={meter.level} />
          </label>
        </>
      )}
      {recording && (
        <button
          className="secondary"
          onClick={() => {
            if (state === "paused") {
              active.current?.resume();
              setState("recording");
            } else {
              active.current?.pause();
              setState("paused");
            }
          }}
        >
          {state === "paused" ? labels.resume : labels.pause}
        </button>
      )}
      <button
        className="secondary"
        aria-expanded={typing}
        disabled={state !== "idle"}
        onClick={() => setTyping(!typing)}
      >
        {ar.flow.type}
      </button>
      {typing && (
        <>
          <label>
            {labels.text}
            <textarea
              rows={4}
              maxLength={12000}
              ref={box}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button
            disabled={state !== "idle" || !text.trim()}
            onClick={() => void submit(text)}
          >
            {labels.parse}
          </button>
        </>
      )}
      <output>
        {state === "busy" ? (
          <PendingIndicator>{labels.busy}</PendingIndicator>
        ) : state === "opening" ? (
          <PendingIndicator>{labels.waiting}</PendingIndicator>
        ) : (
          ""
        )}
      </output>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
