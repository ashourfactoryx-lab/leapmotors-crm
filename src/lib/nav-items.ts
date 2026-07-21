export type Role = "agent" | "team_leader" | "admin";

export type NavItem = {
  key: string;
  title: string;
  href: string;
  icon: keyof typeof ICONS;
};

// Path data for each nav icon, drawn on a 24x24 viewBox (stroke-based, matches
// the rest of the design system's line-icon style).
export const ICONS = {
  mine: '<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
  book: '<path d="M12 5v14M5 12h14"/>',
  daily:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/><path d="M8 15h3"/>',
  dash: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>',
  admin:
    '<path d="M12 2l7 4v5c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V6l7-4z"/><path d="M9 12l2 2 4-4"/>',
  all: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  reports:
    '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx=".5"/><rect x="13" y="8" width="3" height="10" rx=".5"/><rect x="19" y="5" width="0" height="13" rx=".5"/>',
} as const;

const MINE: NavItem = { key: "mine", title: "My Sheet", href: "/my", icon: "mine" };
const BOOK: NavItem = { key: "book", title: "Book Appointment", href: "/book", icon: "book" };
const DAILY: NavItem = { key: "daily", title: "Daily Schedule", href: "/schedule", icon: "daily" };
const DASH: NavItem = { key: "dash", title: "Dashboard", href: "/", icon: "dash" };
const ALL: NavItem = { key: "all", title: "All Appointments", href: "/appointments", icon: "all" };
const REPORTS: NavItem = { key: "reports", title: "Reports", href: "/reports", icon: "reports" };
const ADMIN: NavItem = { key: "admin", title: "Admin Panel", href: "/admin", icon: "admin" };

const NAV_AGENT: NavItem[] = [MINE, BOOK, DAILY, DASH];
const NAV_LEAD: NavItem[] = [MINE, BOOK, DAILY, ALL, REPORTS, DASH];
const NAV_ADMIN: NavItem[] = [ADMIN, MINE, BOOK, DAILY, ALL, REPORTS, DASH];

export function navItemsForRole(role: Role): NavItem[] {
  if (role === "admin") return NAV_ADMIN;
  if (role === "team_leader") return NAV_LEAD;
  return NAV_AGENT;
}

export const ROLE_LABEL: Record<Role, string> = {
  agent: "Call Center · Agent",
  team_leader: "Team Leader",
  admin: "Administrator",
};
