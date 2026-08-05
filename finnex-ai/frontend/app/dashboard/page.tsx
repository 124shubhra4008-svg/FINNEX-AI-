"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Wallet, RefreshCcw, CalendarClock, AlertTriangle, Landmark, PiggyBank, LayoutDashboard, Receipt } from "lucide-react";
import Link from "next/link";
import { api, isLoggedIn } from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";
import StatCard from "@/components/StatCard";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import { MonthlyTrendChart, BalanceTrendChart } from "@/components/SpendingChart";
import ChatWidget from "@/components/ChatWidget";
import PageHeader from "@/components/PageHeader";
import ErrorState from "@/components/ErrorState";

type DashboardData = {
  monthly_totals: Record<string, { income: number; expense: number }>;
  health_score: { score: number; rating: string; tips: string[] };
  prediction: { spent_so_far: number; predicted_month_end: number };
  subscriptions: { name: string; average_amount: number; occurrences: number; category: string }[];
  budgets: { category: string; monthly_limit: number }[];
  goals: { id: number; name: string; target_amount: number; saved_amount: number }[];
  upcoming_bills: { id: number; name: string; amount: number; due_date: string }[];
  due_soon_bills: { id: number; name: string; amount: number; due_date: string }[];
  accounts: { id: number; name: string; balance: number }[];
  total_balance: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<
    { title: string; detail: string; potential_monthly_savings: number }[]
  >([]);
  const { formatMoney } = useCurrency();

  const loadDashboard = () => {
    setError("");
    api.getDashboard().then(setData).catch((e) => setError(e.message));
    api.getSavingsSuggestions().then(setSuggestions).catch(() => {});
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    loadDashboard();
  }, [router]);

  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;
  if (!data) return <p className="text-center mt-10 text-slate-400">Loading your dashboard...</p>;

  const isEmpty = Object.keys(data.monthly_totals).length === 0;

  const months = Object.keys(data.monthly_totals);
  const trendData = months.map((m) => ({
    month: m,
    income: data.monthly_totals[m].income,
    expense: data.monthly_totals[m].expense,
  }));
  const balanceData = months.map((m) => ({
    month: m,
    net: data.monthly_totals[m].income - data.monthly_totals[m].expense,
  }));
  const latest = months.length ? data.monthly_totals[months[months.length - 1]] : { income: 0, expense: 0 };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Overview"
        title="Your Financial Dashboard"
        subtitle="Live insights generated from your transactions"
        color="brand"
      />

      {isEmpty && (
        <div className="glass-card p-6 text-center bg-gradient-to-br from-sky-400/10 to-brand/5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-brand flex items-center justify-center mx-auto mb-3">
            <Receipt size={22} className="text-white" />
          </div>
          <p className="font-semibold mb-1">Your dashboard is empty</p>
          <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">
            Add your income and expenses to start seeing your health score, charts, and AI insights.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/transactions" className="btn-primary inline-flex items-center gap-2">
              <Receipt size={16} /> Add Manually
            </Link>
          </div>
        </div>
      )}

      {data.due_soon_bills.length > 0 && (
        <Link href="/bills" className="glass-card p-4 flex items-center gap-3 border-amber-300/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 block">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            You have {data.due_soon_bills.length} bill{data.due_soon_bills.length > 1 ? "s" : ""} due soon —{" "}
            {data.due_soon_bills.map((b) => b.name).join(", ")}. Tap to review.
          </p>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Balance"
          value={formatMoney(data.total_balance)}
          sublabel={`${data.accounts.length} account${data.accounts.length === 1 ? "" : "s"}`}
          icon={Landmark}
          accent="text-indigo-500"
          iconBg="bg-indigo-500/10"
        />
        <StatCard
          label="This Month's Income"
          value={formatMoney(latest.income)}
          icon={TrendingUp}
          accent="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          label="This Month's Expenses"
          value={formatMoney(latest.expense)}
          icon={TrendingDown}
          accent="text-rose-500"
          iconBg="bg-rose-500/10"
        />
        <StatCard
          label="Predicted Month-End Spend"
          value={formatMoney(data.prediction.predicted_month_end)}
          sublabel={`Spent so far: ${formatMoney(data.prediction.spent_so_far)}`}
          icon={Wallet}
          accent="text-brand"
          iconBg="bg-brand/10"
        />
      </div>

      <HealthScoreGauge score={data.health_score.score} rating={data.health_score.rating} />

      <div className="glass-card p-5">
        <p className="font-semibold mb-3 flex items-center gap-2">💡 AI Recommendations</p>
        <ul className="space-y-2">
          {data.health_score.tips.map((tip, i) => (
            <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex gap-2">
              <span className="text-brand mt-0.5">•</span> {tip}
            </li>
          ))}
        </ul>
      </div>

      {suggestions.length > 0 && (
        <div className="glass-card p-5">
          <p className="font-semibold mb-3 flex items-center gap-2">
            <PiggyBank size={16} className="text-emerald-500" /> Ways to Lower Your Expenses
          </p>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-3 pb-3 border-b border-white/10 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.detail}</p>
                </div>
                {s.potential_monthly_savings > 0 && (
                  <span className="text-emerald-500 text-sm font-semibold whitespace-nowrap">
                    save ~{formatMoney(s.potential_monthly_savings)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {trendData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MonthlyTrendChart data={trendData} />
          <BalanceTrendChart data={balanceData} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <p className="font-semibold mb-3 flex items-center gap-2">
            <RefreshCcw size={16} className="text-sky-500" /> Detected Subscriptions
          </p>
          {data.subscriptions.length === 0 ? (
            <p className="text-sm text-slate-400">None detected yet — add a few months of transactions.</p>
          ) : (
            <ul className="text-sm divide-y divide-slate-100 dark:divide-white/5">
              {data.subscriptions.map((s, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span>{s.name} <span className="text-slate-400">({s.category})</span></span>
                  <span className="font-medium">{formatMoney(s.average_amount)}/mo</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card p-5">
          <p className="font-semibold mb-3 flex items-center gap-2">
            <CalendarClock size={16} className="text-amber-500" /> Upcoming Bills
          </p>
          {data.upcoming_bills.length === 0 ? (
            <p className="text-sm text-slate-400">No unpaid bills tracked.</p>
          ) : (
            <ul className="text-sm divide-y divide-slate-100 dark:divide-white/5">
              {data.upcoming_bills.map((b) => (
                <li key={b.id} className="flex justify-between py-2">
                  <span>{b.name}</span>
                  <span className="font-medium">{formatMoney(b.amount)} — due {b.due_date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ChatWidget />
    </div>
  );
}
