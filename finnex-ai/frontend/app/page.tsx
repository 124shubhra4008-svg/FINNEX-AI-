"use client";

import Link from "next/link";
import {
  Rocket, Bot, BarChart3, PiggyBank, Landmark, CalendarClock, Target,
  ArrowRight, Sparkles, FileSpreadsheet, ScanLine,
} from "lucide-react";

const FEATURES = [
  { icon: Bot, title: "AI Financial Coach", desc: "Ask free-form questions about your money and get real answers from your own data." },
  { icon: BarChart3, title: "Financial Health Score", desc: "A live 0-100 score computed from five weighted factors: savings, budgets, and more." },
  { icon: Landmark, title: "Accounts & Wallets", desc: "Track balances across every bank account, wallet, and card in one place." },
  { icon: PiggyBank, title: "Smart Budgets", desc: "AI auto-categorizes every transaction and tracks adherence in real time." },
  { icon: CalendarClock, title: "Bill & EMI Reminders", desc: "Never miss a due date, with due-soon alerts and optional email reminders." },
  { icon: Target, title: "Savings Goals", desc: "Set targets, deposit toward them, and watch your progress grow." },
  { icon: FileSpreadsheet, title: "Excel/CSV Import", desc: "Already track expenses in a spreadsheet? Import it in one click, fully AI-categorized." },
  { icon: ScanLine, title: "Receipt Scanner", desc: "Snap a photo of a receipt and let AI extract the merchant, amount, and date." },
  { icon: Sparkles, title: "Spend Prediction", desc: "See a live projection of what you'll spend by month-end, updated daily." },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-32 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl" />

      <section className="relative max-w-4xl mx-auto text-center pt-16 pb-20 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-xs font-medium mb-6">
          <Sparkles size={14} className="text-brand" /> AI-Powered Financial Wellness
        </div>
        <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight mb-5 leading-[1.1]">
          Meet <span className="bg-gradient-to-r from-brand via-indigo-500 to-emerald-400 bg-clip-text text-transparent">FINNEX AI+</span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-9">
          Your intelligent financial coach — tracking income, predicting spending,
          scoring your financial health, and answering your money questions in
          plain English.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/signup" className="btn-primary flex items-center gap-2 text-base px-6 py-3">
            Get Started Free <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn-secondary text-base px-6 py-3">
            Log In
          </Link>
        </div>
      </section>

      <section className="relative max-w-6xl mx-auto px-4 pb-24">
        <div className="text-center mb-10">
          <p className="section-label mb-2">Everything in one place</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold">Built for real financial wellness</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div key={i} className="glass-card p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center mb-3">
                <Icon size={20} className="text-brand" />
              </div>
              <p className="font-semibold mb-1">{title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative max-w-3xl mx-auto px-4 pb-24 text-center">
        <div className="glass-card p-10 bg-gradient-to-br from-brand/5 to-emerald-400/5">
          <Rocket size={28} className="text-brand mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-3">Ready to take control of your money?</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Free to use, works fully offline, and takes less than a minute to set up.
          </p>
          <Link href="/signup" className="btn-primary inline-flex items-center gap-2">
            Create your free account <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
