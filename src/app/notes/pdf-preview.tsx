"use client";
import { useEffect, useRef, useState } from "react";
import { PendingIndicator } from "@/app/brand/pending-indicator";
import { ar } from "@/lib/i18n";
import { ManualShareSender } from "@/server/sharing/manual";
const sender = new ManualShareSender();
const t = ar.notes;
export function PdfPreview({ id, filename }: { id: string; filename: string }) {
  const pages = useRef<HTMLDivElement>(null);
  const downloadLink = useRef<HTMLAnchorElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  const url = "/api/notes/" + id + "/pdf";
  useEffect(() => {
    const container = pages.current!;
    const abort = new AbortController();
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    async function load() {
      const res = await fetch(url, { signal: abort.signal });
      if (!res.ok) throw Error();
      const blob = await res.blob();
      if (abort.signal.aborted) return;
      setFile(
        new File([blob], filename, {
          type: "application/pdf",
        }),
      );
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const data = await blob.arrayBuffer();
      if (abort.signal.aborted) return;
      task = pdfjs.getDocument({ data });
      const doc = await task.promise;
      for (let i = 1; i <= doc.numPages; i++) {
        if (abort.signal.aborted) return;
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport }).promise;
        if (abort.signal.aborted) return;
        container.append(canvas);
      }
      setReady(true);
    }
    void load().catch(() => {
      if (!abort.signal.aborted) setError(true);
    });
    return () => {
      abort.abort();
      void task?.destroy();
      container.replaceChildren();
    };
  }, [url, filename]);
  return (
    <section>
      <div className="tools">
        <button
          disabled={!file}
          onClick={() =>
            file && void sender.share(file, () => downloadLink.current?.click())
          }
        >
          {t.share}
        </button>
        <button disabled={!ready} onClick={() => sender.print()}>
          {t.print}
        </button>
        <a
          ref={downloadLink}
          className="action"
          {...sender.download(url, filename)}
        >
          {t.download}
        </a>
        <a href={url} target="_blank" rel="noreferrer">
          {t.open}
        </a>
      </div>
      {!ready && (
        <p role="status">
          {error ? t.error : <PendingIndicator>{t.loading}</PendingIndicator>}
        </p>
      )}
      <div className="pdf-pages" aria-label={t.preview} ref={pages} />
    </section>
  );
}
