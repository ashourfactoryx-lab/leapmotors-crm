"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./NavIcon";
import { navItemsForRole, type Role } from "@/lib/nav-items";

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around gap-1.5 bg-ink px-1.5 py-2 shadow-[0_-6px_24px_rgba(0,0,0,0.18)] print:hidden md:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-[9px] px-0.5 py-1.5 text-[10px] ${
              active ? "text-accent" : "text-[#7B828E]"
            }`}
          >
            <NavIcon icon={item.icon} className="h-5 w-5 stroke-current" />
            {item.title.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}
