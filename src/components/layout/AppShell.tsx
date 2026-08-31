"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import type { Role } from "@/lib/nav-items";
import { usePresence } from "@/lib/use-presence";

export function AppShell({
  userId,
  role,
  userName,
  viewTitle,
  fullWidth,
  children,
}: {
  userId: string;
  role: Role;
  userName: string;
  viewTitle: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  const [railOpen, setRailOpen] = useState(false);
  const onlineCount = usePresence(userId, userName);

  return (
    <div className="min-h-screen">
      <Sidebar role={role} userName={userName} open={railOpen} onNavigate={() => setRailOpen(false)} />
      {railOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/30 md:hidden print:hidden"
          onClick={() => setRailOpen(false)}
        />
      )}
      <div className="min-w-0 md:ml-[236px] rtl:md:ml-0 rtl:md:mr-[236px]">
        <Topbar
          viewTitle={viewTitle}
          onMenuClick={() => setRailOpen((v) => !v)}
          onlineCount={onlineCount}
          compact={fullWidth}
        />
        <main
          className={`px-4 pb-24 md:px-[30px] md:pb-[60px] ${
            fullWidth ? "max-w-none py-3 md:pt-3" : "max-w-[1180px] py-7 md:pt-7"
          }`}
        >
          {children}
        </main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
