"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { NavIcon } from "./NavIcon";
import { navItemsForRole, type Role } from "@/lib/nav-items";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/agent-visuals";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function Sidebar({
  role,
  userName,
  open,
  onNavigate,
}: {
  role: Role;
  userName: string;
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, dir } = useLocale();
  const items = navItemsForRole(role);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 flex w-[230px] flex-col bg-ink p-4 text-white transition-transform duration-200 print:hidden rtl:left-auto rtl:right-0 md:w-[236px] md:translate-x-0 md:rtl:translate-x-0 md:p-[22px_16px] ${
        open ? "translate-x-0 shadow-2xl" : "-translate-x-full rtl:translate-x-full"
      }`}
    >
      <div className="mb-6 flex items-center gap-2.5 px-1">
        <Image
          src="/leapmotor-mark-white.png"
          alt="LeapMotor"
          width={28}
          height={28}
          className="h-7 w-auto"
          priority
        />
        <span className="font-display text-[13.5px] font-semibold uppercase tracking-[0.2em] text-white">
          Leapmotor
        </span>
      </div>

      <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[1.4px] text-[#5A616E]">
        {t("nav.workspace")}
      </div>

      <nav className="flex flex-col gap-[3px]">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className={`relative flex w-full items-center gap-3 rounded-[10px] px-3 py-[11px] text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-[#22262F] text-white before:absolute before:-left-4 before:top-[9px] before:bottom-[9px] before:w-[3px] before:rounded-r-[3px] before:bg-accent rtl:before:-right-4 rtl:before:left-auto rtl:before:rounded-l-[3px] rtl:before:rounded-r-none"
                  : "text-[#B9BFC9] hover:bg-[#22262F] hover:text-[#EDEFF2]"
              }`}
            >
              <NavIcon icon={item.icon} className="h-[18px] w-[18px] flex-none stroke-current" />
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <div className="flex items-center gap-2.5 rounded-[10px] bg-[#22262F] p-2.5">
          <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-accent font-display text-sm font-bold text-[#08221B]">
            {initials(userName)}
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-tight">{userName}</div>
            <div className="font-mono text-[11px] text-[#7B828E]">{t(`role.${role}`).toUpperCase()}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-2 w-full rounded-lg px-2.5 py-2 text-left text-[12.5px] text-[#7B828E] transition-colors hover:bg-[#22262F] hover:text-[#EDEFF2] rtl:text-right"
        >
          {dir === "rtl" ? "→" : "←"} {t("common.signOut")}
        </button>
      </div>
    </aside>
  );
}
