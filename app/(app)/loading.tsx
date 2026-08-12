"use client";

import { useLanguage } from "@/components/language-provider";

export default function Loading() {
  const { t } = useLanguage();
  return (
    <div className="page-loading" role="status">
      <span />
      <p>{t("Cargando datos…", "Loading data…")}</p>
    </div>
  );
}
