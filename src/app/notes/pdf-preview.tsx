"use client";
import { useEffect, useRef, useState } from "react";
import { ar } from "@/lib/i18n";
const t = ar.notes;
export function PdfPreview({
  id,
  number,
  version,
}: {
  id: string;
  number: number;
  version: number;
}) {
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
        new File([blob], "note-" + number + "-v" + version + ".pdf", {
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
  }, [url, number, version]);
  const download = url + "?download=1";
  async function share() {
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    downloadLink.current?.click();
  }
  return (
    <section>
      <div className="tools">
        <button disabled={!file} onClick={share}>
          {t.share}
        </button>
        <button disabled={!ready} onClick={() => window.print()}>
          {t.print}
        </button>
        <a ref={downloadLink} className="action" href={download} download>
          {t.download}
        </a>
        <a href={url} target="_blank" rel="noreferrer">
          {t.open}
        </a>
      </div>
      {!ready && <p role="status">{error ? t.error : t.loading}</p>}
      <div className="pdf-pages" aria-label={t.preview} ref={pages} />
    </section>
  );
}
