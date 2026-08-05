"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, isLoggedIn } from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";
import PageHeader from "@/components/PageHeader";
import { PiggyBank } from "lucide-react";

const CATEGORIES = [
  "Groceries", "Dining", "Transport", "Housing", "Utilities",
  "Entertainment", "Shopping", "Health", "Travel", "Other",
];

export default function BudgetsPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<{ category: string; monthly_limit: number }[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [limit, setLimit] = useState("");
  const { formatMoney } = useCurrency();

  const load = () => api.getBudgets().then(setBudgets);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.setBudget(category, parseFloat(limit));
    setLimit("");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={PiggyBank} eyebrow="Plan" title="Budgets" color="emerald" />

      <form onSubmit={submit} className="glass-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500">Category</label>
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Monthly Limit ($)</label>
          <input type="number" step="1" min="0" required className="input-field" value={limit}
            onChange={(e) => setLimit(e.target.value)} />
        </div>
        <button className="btn-primary">Set Budget</button>
      </form>

      <div className="glass-card p-5">
        {budgets.length === 0 ? (
          <p className="text-slate-400 text-sm">No budgets set yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {budgets.map((b) => (
              <li key={b.category} className="flex justify-between">
                <span>{b.category}</span>
                <span>{formatMoney(b.monthly_limit)}/mo</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
