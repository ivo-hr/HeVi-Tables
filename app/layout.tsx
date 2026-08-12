import type { Metadata, Viewport } from "next";

import { LanguageProvider } from "@/components/language-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { getAppLocale } from "@/lib/i18n-server";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAppLocale();
  return {
    title: {
      default: "HeVi Tables",
      template: "%s · HeVi Tables"
    },
    description:
      locale === "en"
        ? "Private predictions, final results and leaderboards with a memory."
        : "Predicciones privadas, resultados cerrados y ránkings con memoria.",
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
}

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

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getAppLocale();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <LanguageProvider locale={locale}>
          {children}
          <ServiceWorkerRegister />
        </LanguageProvider>
      </body>
    </html>
  );
}
