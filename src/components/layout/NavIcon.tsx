import { ICONS } from "@/lib/nav-items";

export function NavIcon({ icon, className }: { icon: keyof typeof ICONS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICONS[icon] }}
    />
  );
}
