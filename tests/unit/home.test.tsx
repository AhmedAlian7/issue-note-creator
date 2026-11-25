import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "@/app/layout";
import Home from "@/app/page";
import { ar } from "@/lib/i18n";

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/app/pwa/register", () => ({ RegisterWorker: () => null }));

describe("Arabic home page", () => {
  it("renders the localized heading and declares the document language and direction", async () => {
    const html = renderToStaticMarkup(await RootLayout({ children: <Home /> }));

    expect(html).toContain('<html lang="ar-EG" dir="rtl">');
    expect(html).toContain(`${ar.appName}</h1>`);
    expect(metadata.title).toBe(ar.appName);
  });
});
