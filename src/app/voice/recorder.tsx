"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ar } from "@/lib/i18n";
import type { VoiceResult } from "@/ai/pipeline";
import { capture } from "./capture";

const labels = ar.voice;
export function VoiceRecorder() {
  const [state, setState] = useState<
    "idle" | "opening" | "recording" | "paused" | "busy"
  >("idle");
  const [meter, setMeter] = useState({ ms: 0, level: 0 });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<VoiceResult | null>(null);
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
    setError(message);
    setState("idle");
    requestAnimationFrame(() => box.current?.focus());
  }
  async function submit(input: Blob | string) {
    setState("busy");
    setError("");
    setResult(null);
    try {
      const typed = typeof input === "string";
      const response = await fetch("/api/voice/parse", {
        method: "POST",
        headers: { "Content-Type": typed ? "application/json" : input.type },
        body: typed ? JSON.stringify({ transcript: input }) : input,
        signal: AbortSignal.timeout(115000),
      });
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
        setResult(data);
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
    setResult(null);
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
        className="voice-mic"
        disabled={!recording && state !== "idle"}
        onClick={() => (recording ? active.current?.stop() : void start())}
      >
        <span aria-hidden="true">🎙</span>{" "}
        {recording ? labels.stop : labels.start}
      </button>
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
      <output>
        {state === "busy"
          ? labels.busy
          : state === "opening"
            ? labels.waiting
            : ""}
      </output>
      {error && <p role="alert">{error}</p>}
      {result && (
        <section>
          <h2>{labels.result}</h2>
          {result.draft.lines.map(
            (line, i) =>
              line.unmatched && (
                <p key={i}>
                  {labels.missing} «{line.spokenText}»{" "}
                  <Link
                    className="action"
                    href={
                      "/products/new?name=" +
                      encodeURIComponent(line.spokenText)
                    }
                  >
                    {labels.add}
                  </Link>
                </p>
              ),
          )}
          <pre className="voice-debug" dir="auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
