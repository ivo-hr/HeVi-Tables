"use client";

import { useEffect } from "react";

import type { AccentColor, ThemePreference } from "@/lib/types";

export function applyAppearance(theme: ThemePreference, accent: AccentColor) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = theme;
  document.documentElement.dataset.accent = accent;
}

export function ThemeController({
  theme,
  accent
}: {
  theme: ThemePreference;
  accent: AccentColor;
}) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyAppearance(theme, accent);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme, accent]);

  return null;
}
