import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout, { metadata } from "@/app/layout";
import Home from "@/app/page";
import { ar } from "@/lib/i18n";

describe("Arabic home page", () => {
  it("renders the localized heading and declares the document language and direction", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <Home />
      </RootLayout>,
    );

    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain(`${ar.appName}</h1>`);
    expect(metadata.title).toBe(ar.appName);
  });
});
