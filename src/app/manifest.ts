import type { MetadataRoute } from "next";
import { ar } from "@/lib/i18n";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/workspace",
    name: ar.appName,
    short_name: ar.pwa.shortName,
    lang: "ar-EG",
    dir: "rtl",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#123769",
    icons: [
      {
        src: "/icons/warehouse-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/warehouse-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/warehouse-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
