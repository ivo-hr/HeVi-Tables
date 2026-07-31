import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegister } from "@/components/service-worker-register";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HeVi Tables",
    template: "%s · HeVi Tables"
  },
  description: "Predicciones privadas, resultados cerrados y ránkings con memoria.",
  applicationName: "HeVi Tables",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HeVi"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe5" },
    { media: "(prefers-color-scheme: dark)", color: "#101713" }
  ],
  colorScheme: "light dark"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
