"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ar } from "@/lib/i18n";
import { VoiceRecorder } from "../voice/recorder";
import { keeperKey } from "../pwa/drafts";
import { useOnline } from "../pwa/connectivity";
import { WaitingDrafts } from "../pwa/waiting-drafts";

const subscribe = () => () => {};

export function OfflineRecorder() {
  const online = useOnline();
  const userId = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(keeperKey);
      } catch {
        return null;
      }
    },
    () => null,
  );
  useEffect(() => {
    const reopen = () => window.location.replace("/workspace");
    window.addEventListener("online", reopen);
    return () => window.removeEventListener("online", reopen);
  }, []);
  return (
    <>
      <p className="report-panel" role="status">
        {ar.pwa.offline}
      </p>
      {userId ? (
        <>
          <VoiceRecorder userId={userId} localOnly onResult={() => {}} />
          <WaitingDrafts userId={userId} />
        </>
      ) : (
        <p>{ar.pwa.signInFirst}</p>
      )}
      {online && (
        <a className="action" href="/workspace">
          {ar.workspace}
        </a>
      )}
    </>
  );
}
