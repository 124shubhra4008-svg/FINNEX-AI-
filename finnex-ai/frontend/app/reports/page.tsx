"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api, isLoggedIn } from "@/lib/api";
import { categoryColor } from "@/lib/categoryColors";
import { useCurrency } from "@/lib/CurrencyContext";
import ErrorState from "@/components/ErrorState";

type Tx = {
  id: number;
  date: string;
  type: "income" | "expense";
  category: string;
  merchant: string | null;
  description: string;
  amount: number;
};

const COLORS = ["#6C5CE7", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7", "#ec4899", "#14b8a6", "#84cc16"];

function downloadCsv(transactions: Tx[]) {
  const headers = ["Date", "Type", "Category", "Merchant", "Description", "Amount"];
  const rows = transactions.map((t) => [t.date, t.type, t.category, t.merchant || "", t.description || "", t.amount]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finnex-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [error, setError] = useState("");
  const { formatMoney } = useCurrency();

  const load = () => {
    setError("");
    api.getTransactions().then(setTransactions).catch((e) => setError(e.message));
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  const expenseByCategory: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach((t) => {
    if (t.type === "expense") {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      totalExpense += t.amount;
    } else {
      totalIncome += t.amount;
    }
  });
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-sky-400/20">
            <PieChartIcon size={22} className="text-white" />
          </div>
          <div>
            <p className="section-label mb-0.5">Insights</p>
            <h1 className="page-title">Reports & Spending History</h1>
          </div>
        </div>
        <button onClick={() => downloadCsv(transactions)} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-sm text-slate-400">Total Income (all time)</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{formatMoney(totalIncome)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-slate-400">Total Expenses (all time)</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">{formatMoney(totalExpense)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-slate-400">Net</p>
          <p className="text-2xl font-bold text-brand mt-1">{formatMoney(totalIncome - totalExpense)}</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="font-semibold mb-3 flex items-center gap-2">
          <PieChartIcon size={16} className="text-brand" /> Spending Breakdown by Category
        </p>
        {pieData.length === 0 ? (
          <p className="text-sm text-slate-400">No expenses recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass-card p-5 overflow-x-auto">
        <p className="font-semibold mb-3">Full Spending History</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-white/20">
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Category</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-white/10">
                <td className="py-2">{t.date}</td>
                <td className={t.type === "income" ? "text-green-500" : "text-red-500"}>{t.type}</td>
                <td><span className={`category-badge ${categoryColor(t.category)}`}>{t.category}</span></td>
                <td className="text-right">{formatMoney(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && <p className="text-slate-400 text-sm mt-3">No transactions yet.</p>}
      </div>
    </div>
  );
}
