"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Receipt, PiggyBank, Target, LogOut, Rocket, Landmark, CalendarClock,
  TrendingUp, FileBarChart, Settings, ScanLine,
} from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";
import { clearToken, isLoggedIn } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/receipts", label: "Receipt Scanner", icon: ScanLine },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/bills", label: "Bills & EMI", icon: CalendarClock },
  { href: "/investment", label: "Investment", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // Start as false on both server and first client render (matching), then
  // check localStorage only after mount. This avoids a hydration mismatch,
  // since the server never has access to localStorage.
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [pathname]);

  if (!loggedIn) return null;

  const logout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 backdrop-blur-md px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <Link href="/" className="flex items-center gap-2" title="Back to homepage">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-emerald-400 flex items-center justify-center">
            <Rocket size={18} className="text-white" />
          </div>
          <div>
            <p className="font-display font-bold leading-none">FINNEX</p>
            <p className="text-[10px] tracking-widest text-slate-400 font-semibold">AI+</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        <p className="section-label px-3 mb-2">Menu</p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 pt-4 border-t border-slate-200/70 dark:border-white/10">
        <DarkModeToggle />
        <button onClick={logout} className="sidebar-link w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500">
          <LogOut size={18} />
          Log out
        </button>
        <p className="text-[10px] text-center text-slate-300 dark:text-slate-600 pt-1">
          build v10-scanner-fixed-vision-ai
        </p>
      </div>
    </aside>
  );
}
