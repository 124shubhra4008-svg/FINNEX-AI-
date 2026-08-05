"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Target as TargetIcon } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";
import PageHeader from "@/components/PageHeader";

type Goal = { id: number; name: string; target_amount: number; saved_amount: number; target_date: string | null };

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deposits, setDeposits] = useState<Record<number, string>>({});
  const { formatMoney } = useCurrency();

  const load = () => api.getGoals().then(setGoals);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addGoal({ name, target_amount: parseFloat(target) });
    setName("");
    setTarget("");
    load();
  };

  const deposit = async (id: number) => {
    const amount = parseFloat(deposits[id] || "0");
    if (amount <= 0) return;
    await api.depositToGoal(id, amount);
    setDeposits({ ...deposits, [id]: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={TargetIcon} eyebrow="Grow" title="Savings Goals" color="amber" />

      <form onSubmit={submit} className="glass-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500">Goal name</label>
          <input className="input-field" placeholder="e.g. Emergency Fund" required value={name}
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Target amount ($)</label>
          <input type="number" step="1" min="1" required className="input-field" value={target}
            onChange={(e) => setTarget(e.target.value)} />
        </div>
        <button className="btn-primary">Add Goal</button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {goals.map((g, i) => {
          const pct = g.target_amount ? Math.min(100, (g.saved_amount / g.target_amount) * 100) : 0;
          const complete = pct >= 100;
          return (
            <div
              key={g.id}
              className={`glass-card p-5 animate-fade-in-up stagger-${Math.min(i + 1, 5)} ${complete ? "goal-complete relative overflow-hidden" : ""}`}
            >
              {complete && (
                <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-400 to-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                  <PartyPopper size={12} /> Goal Reached!
                </div>
              )}
              <p className="font-medium flex items-center gap-2">
                <TargetIcon size={16} className={complete ? "text-amber-500" : "text-brand"} />
                {g.name}
              </p>
              <p className="text-sm text-slate-500 mb-2 mt-1">
                {formatMoney(g.saved_amount)} / {formatMoney(g.target_amount)} ({pct.toFixed(0)}%)
              </p>
              <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full transition-all duration-500 ${complete ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-brand"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number" step="1" min="1" placeholder="Add $"
                  className="input-field text-sm"
                  value={deposits[g.id] || ""}
                  onChange={(e) => setDeposits({ ...deposits, [g.id]: e.target.value })}
                />
                <button onClick={() => deposit(g.id)} className="btn-secondary text-sm">Deposit</button>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="empty-state sm:col-span-2">
            <TargetIcon size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No savings goals yet — add your first one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
