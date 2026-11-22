"use client";
import { useEffect, useRef, useState } from "react";
import { ar } from "@/lib/i18n";
export function FirstHelp({ userId }: { userId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const key = "voice-help:" + userId;
  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) dialog.current?.showModal();
    } catch {}
  }, [key]);
  function close() {
    try {
      localStorage.setItem(key, "1");
    } catch {}
    dialog.current?.close();
  }
  return (
    <dialog ref={dialog} onCancel={close} aria-labelledby="voice-guide">
      <h2 id="voice-guide">
        {ar.flow.help} · {step + 1}/3
      </h2>
      <p>{ar.flow.steps[step]}</p>
      <div className="tools">
        <button onClick={() => (step === 2 ? close() : setStep(step + 1))}>
          {step === 2 ? ar.flow.done : ar.flow.next}
        </button>
        <button className="secondary" onClick={close}>
          {ar.flow.skip}
        </button>
      </div>
    </dialog>
  );
}
