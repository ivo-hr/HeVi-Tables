export const LEGAL_CREATOR =
  process.env.NEXT_PUBLIC_LEGAL_CREATOR?.trim() || "Ivo (ivo-hr)";

export const LEGAL_CONTACT =
  process.env.NEXT_PUBLIC_LEGAL_CONTACT?.trim() ||
  "https://github.com/ivo-hr/HeVi-Tables/issues";

export const LEGAL_ADDRESS =
  process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || "";

export const LEGAL_REGISTRATION =
  process.env.NEXT_PUBLIC_LEGAL_REGISTRATION?.trim() || "";

export const LEGAL_REPOSITORY =
  process.env.NEXT_PUBLIC_LEGAL_REPOSITORY?.trim() ||
  "https://github.com/ivo-hr/HeVi-Tables";

export const LEGAL_UPDATED_AT = "2026-08-12";

export function legalContactHref() {
  return LEGAL_CONTACT.includes("@") && !LEGAL_CONTACT.startsWith("http")
    ? `mailto:${LEGAL_CONTACT}`
    : LEGAL_CONTACT;
}
