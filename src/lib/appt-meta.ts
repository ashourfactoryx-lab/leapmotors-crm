export type ApptStatus =
  | "scheduled"
  | "confirmed"
  | "attended"
  | "no_show"
  | "rescheduled"
  | "cancelled"
  | "closed_sold";

export const STATUS_META: Record<ApptStatus, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "#8A94A3" },
  confirmed: { label: "Confirmed", color: "#3B7BF6" },
  attended: { label: "Attended", color: "#0BD1A0" },
  no_show: { label: "No Show", color: "#F0524B" },
  rescheduled: { label: "Rescheduled", color: "#8A6BF0" },
  cancelled: { label: "Cancelled", color: "#B8BEC8" },
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
