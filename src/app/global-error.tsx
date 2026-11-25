"use client";

import "./globals.css";
import ErrorPage from "./error";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ar-EG" dir="rtl">
      <body>
        <ErrorPage reset={reset} />
      </body>
    </html>
  );
}
