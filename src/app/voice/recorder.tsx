"use client";
import type { EditContext } from "@/ai/edits";
import type { processEdit } from "@/server/voice";
import { useEffect, useRef, useState } from "react";
import { PendingIndicator } from "@/app/brand/pending-indicator";
import { ar } from "@/lib/i18n";
import type { VoiceResult } from "@/ai/pipeline";
import { enqueue, sendVoice } from "../pwa/drafts";
import { useOnline } from "../pwa/connectivity";
import { capture } from "./capture";

const labels = ar.voice;
type Props = {
  userId?: string;
  localOnly?: boolean;
  onResult: (result: VoiceResult) => void;
  label?: string;
  correction?: {
    current: EditContext;
    apply: (result: Awaited<ReturnType<typeof processEdit>>) => void;
  };
};
export function VoiceRecorder({
  onResult,
  label,
  correction,
  userId,
  localOnly,
}: Props) {
  const online = useOnline();
  const [stored, setStored] = useState(false);
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
    setStored(false);

    async function store() {
      if (!userId) return fail(labels.failed);
      try {
        await enqueue(userId, input);
        if (!mounted.current) return;
        setText("");
        setStored(true);
        setState("idle");
      } catch {
        fail(ar.pwa.storageError);
      }
    }
    if (localOnly || (!navigator.onLine && userId)) return store();

    try {
      const typed = typeof input === "string";
      const form = new FormData();
      if (correction) {
        form.set("current", JSON.stringify(correction.current));
        form.set("input", input);
      }
      const response = correction
        ? await fetch("/api/voice/edit", {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(115_000),
          })
        : await sendVoice(input, userId);
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
      if (userId) await store();
      else fail(labels.failed);
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
            {(localOnly || !online) && userId ? ar.pwa.save : labels.parse}
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
      {stored && <p role="status">{ar.pwa.queued}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
