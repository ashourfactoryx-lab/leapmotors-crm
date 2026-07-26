import { en, he } from "./dictionary";
import type { Locale } from "./locale";

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, he };

// Plain, non-hook function so Server Components can translate strings they
// render themselves (e.g. AppShell's viewTitle) — the client-side t() from
// useLocale() is just this function bound to the current locale.
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const template = DICTIONARIES[locale][key] ?? DICTIONARIES.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}
