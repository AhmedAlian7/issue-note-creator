export interface NoteSender {
  share(file: File, download: () => void): Promise<void>;
  print(): void;
  download(url: string, filename: string): { href: string; download: string };
}

// Native sharing and printing require the browser and a keeper gesture.
export class ManualShareSender implements NoteSender {
  async share(file: File, download: () => void) {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }
    download();
  }

  print() {
    window.print();
  }

  download(url: string, filename: string) {
    return { href: url + "?download=1", download: filename };
  }
}
