import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegister } from "@/components/service-worker-register";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HeVi Tables",
    template: "%s · HeVi Tables"
  },
  description: "Tablas, apuestas entre amigos y ránkings sin discusiones.",
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
  themeColor: "#f4efe5",
  colorScheme: "light"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
