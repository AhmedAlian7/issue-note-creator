import type { VoiceResult } from "@/ai/pipeline";
import type { Draft } from "../voice/review-model";

export type EditorDraft = {
  data: Draft;
  noteId?: string;
  updatedAt?: string;
};

export type QueuedDraft = {
  id: string;
  userId: string;
  createdAt: number;
  input?: string | Blob;
  result?: VoiceResult;
  editor?: EditorDraft;
  error?: string;
};

export const keeperKey = "warehouse-offline-keeper";
export const queueEvent = "warehouse-drafts-changed";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("warehouse-drafts", 1);
    request.onupgradeneeded = () => {
      request.result
        .createObjectStore("drafts", { keyPath: "id" })
        .createIndex("keeper", "userId");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("drafts", mode);
      const request = run(tx.objectStore("drafts"));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error ?? request.error);
    });
  } finally {
    db.close();
  }
}

export async function listDrafts(userId: string): Promise<QueuedDraft[]> {
  const records = await transaction("readonly", (store) =>
    store.index("keeper").getAll(userId),
  );
  return records.sort((a, b) => a.createdAt - b.createdAt);
}

export async function putDraft(draft: QueuedDraft) {
  await transaction("readwrite", (store) => store.put(draft));
  window.dispatchEvent(new Event(queueEvent));
}

export async function deleteDraft(id: string) {
  await transaction("readwrite", (store) => store.delete(id));
  window.dispatchEvent(new Event(queueEvent));
}

export function enqueue(userId: string, input: Blob | string) {
  return putDraft({
    id: crypto.randomUUID(),
    userId,
    createdAt: Date.now(),
    input,
  });
}

export function sendVoice(
  input: Blob | string,
  userId?: string,
  draftId?: string,
) {
  const typed = typeof input === "string";
  return fetch("/api/voice/parse", {
    method: "POST",
    headers: {
      "Content-Type": typed ? "application/json" : input.type,
      ...(userId ? { "X-Draft-Keeper": userId } : {}),
      ...(draftId ? { "X-Draft-Id": draftId } : {}),
    },
    body: typed ? JSON.stringify({ transcript: input }) : input,
    signal: AbortSignal.timeout(115_000),
  });
}
