import type { AppLocale } from "@/lib/i18n";

export const MAX_IMAGE_DIMENSION = 512;
export const MAX_IMAGE_OUTPUT_BYTES = 1024 * 1024;
export const MAX_IMAGE_SOURCE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export function isAcceptedImageType(type: string) {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function imageConstraintDescription(locale: AppLocale = "es") {
  return locale === "en"
    ? "We will prepare it automatically so it looks right."
    : "La prepararemos automáticamente para que quede bien.";
}
