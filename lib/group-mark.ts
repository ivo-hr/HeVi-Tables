const graphemeSegmenter = new Intl.Segmenter("es", {
  granularity: "grapheme"
});

export function groupMarkSymbols(value: string) {
  return Array.from(graphemeSegmenter.segment(value), (part) => part.segment);
}

export function groupMarkLength(value: string) {
  return groupMarkSymbols(value).length;
}

export function normalizeGroupMark(value: string) {
  return value.trim().normalize("NFC").toLocaleUpperCase("es");
}

export function truncateGroupMark(value: string, maximum = 3) {
  const compact = value
    .replace(/\s/gu, "")
    .normalize("NFC")
    .toLocaleUpperCase("es");
  return groupMarkSymbols(compact).slice(0, maximum).join("");
}
