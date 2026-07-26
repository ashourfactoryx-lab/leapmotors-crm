export type Locale = "en" | "he";
export const LOCALE_COOKIE = "locale";

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "he" ? "rtl" : "ltr";
}

// Used anywhere a date/number needs to render in the current language
// (weekday/month names, digit grouping) via the native Intl APIs — no
// dictionary entries needed since the browser/Node already knows Hebrew.
export function dateLocaleTag(locale: Locale): string {
  return locale === "he" ? "he-IL" : "en-GB";
}
