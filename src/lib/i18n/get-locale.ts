import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./locale";

// Server Components can't use the LocaleProvider context (it's client-only),
// so pages read the cookie directly here to translate server-rendered
// strings (e.g. AppShell's viewTitle) before handing off to client children.
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return cookieStore.get(LOCALE_COOKIE)?.value === "he" ? "he" : "en";
}
