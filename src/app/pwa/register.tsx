"use client";

import { keeperKey } from "./drafts";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function RegisterWorker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/login" && navigator.onLine) {
      try {
        localStorage.removeItem(keeperKey);
      } catch {}
    }
  }, [pathname]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then(({ active }) => {
        if (navigator.onLine) active?.postMessage("refresh-shell");
      })
      .catch(() => {});
  }, []);
  return null;
}
