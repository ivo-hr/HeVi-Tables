import type { MetadataRoute } from "next";
import { getServerTranslator } from "@/lib/i18n-server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { locale, t } = await getServerTranslator();
  return {
    name: "HeVi Tables",
    short_name: "HeVi",
    description: t("Predicciones privadas, resultados cerrados y ránkings con memoria.", "Private predictions, final results and leaderboards with a memory."),
    start_url: "/",
    id: "/",
    display: "standalone",
    background_color: "#f4efe5",
    theme_color: "#f4efe5",
    orientation: "portrait-primary",
    lang: locale,
    categories: ["social", "entertainment"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
