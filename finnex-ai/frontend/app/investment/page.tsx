"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ShieldAlert, ShieldCheck, Zap, PieChart } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";
import PageHeader from "@/components/PageHeader";
import ErrorState from "@/components/ErrorState";

type Plan = {
  risk_profile: string;
  monthly_surplus: number;
  suggested_allocation: Record<string, number>;
  disclaimer: string;
};

const RISK_OPTIONS = [
  { value: "conservative", label: "Conservative", icon: ShieldCheck, desc: "Prioritize safety over growth", gradient: "from-emerald-400 to-teal-400" },
  { value: "moderate", label: "Moderate", icon: ShieldAlert, desc: "Balanced growth and safety", gradient: "from-amber-400 to-orange-400" },
  { value: "aggressive", label: "Aggressive", icon: Zap, desc: "Prioritize growth over safety", gradient: "from-rose-400 to-pink-400" },
];

const COLORS: Record<string, string> = {
  "Emergency Fund": "bg-emerald-500",
  "Fixed Deposits": "bg-sky-500",
  "Mutual Funds (Debt)": "bg-indigo-500",
  "Equity SIP": "bg-amber-500",
};

export default function InvestmentPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { formatMoney } = useCurrency();

  const load = () => {
    setLoading(true);
    setError("");
    api
      .getInvestmentPlan()
      .then((p) => {
        setPlan(p);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (loading || !plan) return <p className="text-center mt-10 text-slate-400">Loading your investment plan...</p>;

  const total = Object.values(plan.suggested_allocation).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        eyebrow="Grow Further"
        title="Investment Planner"
        subtitle="Educational allocation suggestions based on your surplus and risk appetite"
        color="purple"
      />

      <div className="glass-card p-5 bg-gradient-to-br from-brand/5 to-emerald-400/5">
        <p className="text-sm text-slate-400">This Month's Surplus (Income − Expenses)</p>
        <p className="text-3xl font-bold text-brand mt-1">{formatMoney(plan.monthly_surplus)}</p>
      </div>

      <div className="glass-card p-5">
        <p className="font-semibold mb-3 flex items-center gap-2">
          <PieChart size={16} className="text-brand" /> Suggested Monthly Allocation
        </p>

        {total === 0 ? (
          <p className="text-sm text-slate-400">
            No surplus detected this month — once your income exceeds your expenses, you will see a suggested breakdown here.
          </p>
        ) : (
          <>
            <div className="w-full h-3 rounded-full overflow-hidden flex mb-4">
              {Object.entries(plan.suggested_allocation).map(([name, amount]) => (
                <div key={name} className={COLORS[name] || "bg-slate-400"}
                  style={{ width: `${(amount / total) * 100}%` }} />
              ))}
            </div>
            <ul className="space-y-2">
              {Object.entries(plan.suggested_allocation).map(([name, amount]) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${COLORS[name] || "bg-slate-400"}`} />
                    {name}
                  </span>
                  <span className="font-medium">{formatMoney(amount)} ({((amount / total) * 100).toFixed(0)}%)</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="text-xs text-slate-400 mt-4 border-t border-white/10 pt-3">{plan.disclaimer}</p>
      </div>

      <div className="glass-card p-5">
        <p className="font-semibold mb-3">Change Risk Profile</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {RISK_OPTIONS.map(({ value, label, icon: Icon, desc, gradient }) => (
            <button
              key={value}
              onClick={async () => {
                await api.updateRiskProfile(value);
                load();
              }}
              className={`glass-card p-4 text-left hover:-translate-y-0.5 transition-transform relative overflow-hidden ${
                plan.risk_profile === value ? "ring-2 ring-brand" : ""
              }`}
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2`}>
                <Icon size={16} className="text-white" />
              </div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
