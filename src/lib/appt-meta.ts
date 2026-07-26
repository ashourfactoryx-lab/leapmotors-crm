export type ApptStatus =
  | "scheduled"
  | "confirmed"
  | "attended"
  | "no_show"
  | "rescheduled"
  | "cancelled"
  | "closed_sold";

// Colors validated as a categorical set (lightness band, chroma floor, CVD
// adjacent-pair separation, normal-vision floor) — see the dataviz skill's
// validate_palette.js. Scheduled/Cancelled were re-picked from washed-out
// grays that failed the chroma floor; the rest already passed.
export const STATUS_META: Record<ApptStatus, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "#3D5A99" },
  confirmed: { label: "Confirmed", color: "#3B7BF6" },
  attended: { label: "Attended", color: "#0BD1A0" },
  no_show: { label: "No Show", color: "#F0524B" },
  rescheduled: { label: "Rescheduled", color: "#8A6BF0" },
  cancelled: { label: "Cancelled", color: "#AD6690" },
  closed_sold: { label: "Closed / Sold", color: "#C79A3B" },
};

export const STATUS_ORDER: ApptStatus[] = [
  "scheduled",
  "confirmed",
  "attended",
  "no_show",
  "rescheduled",
  "cancelled",
  "closed_sold",
];

export type ApptSource = "phone_call" | "whatsapp" | "other";

export const SOURCE_LABEL: Record<ApptSource, string> = {
  phone_call: "Phone Call",
  whatsapp: "WhatsApp",
  other: "Other",
};

// STATUS_META/SOURCE_LABEL above stay English-only (colors + fallback text);
// these translate the label through whatever `t` a component already has,
// so every status/source string in the UI comes from one dictionary.
type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function statusLabel(t: Translate, status: ApptStatus): string {
  return t(`status.${status}`);
}

export function sourceLabel(t: Translate, source: ApptSource): string {
  return t(`source.${source}`);
}
