// Formats a Date's LOCAL calendar day as YYYY-MM-DD. Never use
// .toISOString() for this: it serializes to UTC, which silently rolls the
// date back (or forward) a day whenever the local offset crosses midnight
// relative to UTC — exactly the bug that once made the schedule's date-nav
// arrows jump by two days instead of one.
export function isoFromLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return isoFromLocalDate(new Date());
}

export function isValidISODate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(new Date(`${iso}T00:00:00`).getTime());
}
