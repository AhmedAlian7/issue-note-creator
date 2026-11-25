"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ar } from "@/lib/i18n";
import { noteNumberText } from "@/lib/inputs";

const t = ar.notes;

export function NumberControl({
  value,
  onChange,
  disabled,
}: {
  value?: number;
  onChange: (value?: number) => void;
  disabled?: boolean;
}) {
  const title = useId();
  const help = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const parsed = noteNumberText.safeParse(text);

  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);

  function choose(number?: number) {
    onChange(number);
    dialog.current?.close();
  }

  return (
    <div className="note-number-control">
      <bdi>{value ?? t.numberPending}</bdi>
      <button
        type="button"
        className="secondary"
        disabled={disabled}
        onClick={() => {
          setText(value?.toString() ?? "");
          setEditing(false);
          dialog.current?.showModal();
        }}
      >
        {t.changeNumber}
      </button>
      <dialog ref={dialog} aria-labelledby={title} aria-describedby={help}>
        <form
          className="fields note-number-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (editing && parsed.success) choose(parsed.data);
          }}
        >
          <h2 id={title}>{t.changeNumber}</h2>
          {editing ? (
            <>
              <label>
                {t.customNumber}
                <input
                  ref={input}
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  dir="ltr"
                  value={text}
                  aria-describedby={help}
                  onChange={(event) => setText(event.target.value)}
                />
              </label>
              <p id={help}>{t.invalidNumber}</p>
            </>
          ) : (
            <p id={help} className="note-number-warning">
              {t.numberWarning}
            </p>
          )}
          <div className="tools">
            <button
              type="button"
              className="secondary"
              onClick={() => dialog.current?.close()}
            >
              {t.cancel}
            </button>
            {editing ? (
              <button type="submit" disabled={!parsed.success}>
                {t.applyNumber}
              </button>
            ) : (
              <button type="button" onClick={() => setEditing(true)}>
                {t.numberContinue}
              </button>
            )}
            {value !== undefined && (
              <button
                type="button"
                className="secondary"
                onClick={() => choose()}
              >
                {t.automaticNumber}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </div>
  );
}
