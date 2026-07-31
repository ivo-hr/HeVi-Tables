import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HeVi Tables",
    short_name: "HeVi",
    description: "Predicciones privadas, resultados cerrados y ránkings con memoria.",
    start_url: "/",
    id: "/",
    display: "standalone",
    background_color: "#f4efe5",
    theme_color: "#f4efe5",
    orientation: "portrait-primary",
    lang: "es",
    categories: ["social", "entertainment"],
    icons: [
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
