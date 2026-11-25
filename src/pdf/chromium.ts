import type { Browser, BrowserContext } from "playwright";

const launchTimeout = 15_000;
const renderTimeout = 25_000;
const queueTimeout = 120_000;
const concurrency = 2;

let browser: Promise<Browser> | undefined;
function getBrowser() {
  if (!browser) {
    const launch = import("playwright").then(({ chromium }) =>
      chromium.launch({ timeout: launchTimeout }),
    );
    browser = launch;
    const reset = () => {
      if (browser === launch) browser = undefined;
    };
    void launch.then((instance) => instance.on("disconnected", reset), reset);
  }
  return browser;
}

let active = 0;
const waiting: (() => void)[] = [];

async function acquire() {
  if (active < concurrency) {
    active += 1;
    return;
  }
  if (waiting.length >= 32) throw new Error("PDF queue is full");
  await new Promise<void>((resolve, reject) => {
    const enter = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      waiting.splice(waiting.indexOf(enter), 1);
      reject(new Error("PDF queue timed out"));
    }, queueTimeout);
    waiting.push(enter);
  });
}

async function deadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Chromium timed out")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function chromiumHealthy() {
  return deadline(
    getBrowser().then(async (instance) => {
      // A protocol round trip checks responsiveness as well as process liveness.
      const session = await instance.newBrowserCDPSession();
      try {
        await session.send("Browser.getVersion");
        return instance.isConnected();
      } finally {
        await session.detach();
      }
    }),
    launchTimeout + 1000,
  );
}

export async function withRenderSlot<T>(render: () => Promise<T>) {
  await acquire();
  try {
    return await render();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active -= 1;
  }
}

export async function renderWithChromium(html: string): Promise<Uint8Array> {
  let context: BrowserContext | undefined;
  let expired = false;
  try {
    const instance = await getBrowser();
    return await deadline(
      (async () => {
        const created = await instance.newContext();
        if (expired) {
          await created.close();
          throw new Error("Chromium context expired");
        }
        context = created;
        const page = await context.newPage();
        await page.setContent(html, { waitUntil: "load" });
        await page.evaluate("window.printImagesReady");
        return page.pdf({ preferCSSPageSize: true, printBackground: true });
      })(),
      renderTimeout,
    );
  } finally {
    expired = true;
    if (context) await deadline(context.close(), 3000).catch(() => {});
  }
}

export async function closeChromium() {
  const instance = await browser?.catch(() => undefined);
  await instance?.close();
}
