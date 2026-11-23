import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ar } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: ar.appName,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar-EG" dir="rtl">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
