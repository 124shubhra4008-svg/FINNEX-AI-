"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, PiggyBank, Target, Rocket, Landmark, CalendarClock, TrendingUp, FileBarChart, Settings, ScanLine } from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";
import { isLoggedIn } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Tx", icon: Receipt },
  { href: "/receipts", label: "Scan", icon: ScanLine },
  { href: "/accounts", label: "Accts", icon: Landmark },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/bills", label: "Bills", icon: CalendarClock },
  { href: "/investment", label: "Invest", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [pathname]);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand">
          <Rocket size={18} /> FINNEX AI+
        </Link>
        <DarkModeToggle />
      </div>
      {loggedIn && (
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-950/40 py-2 px-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 text-xs px-2 ${active ? "text-brand" : "text-slate-400"}`}>
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
