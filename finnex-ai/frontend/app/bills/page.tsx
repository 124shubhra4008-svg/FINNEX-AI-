"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, CalendarClock } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";
import PageHeader from "@/components/PageHeader";

type Bill = {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  paid: number;
  recurring: string;
};

function daysUntil(dateStr: string) {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function BillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurring, setRecurring] = useState("monthly");
  const [error, setError] = useState("");
  const { formatMoney } = useCurrency();

  const load = () => api.getBills().then(setBills).catch((e) => setError(e.message));

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.addBill({ name, amount: parseFloat(amount), due_date: dueDate, recurring });
      setName("");
      setAmount("");
      setDueDate("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const pay = async (id: number) => {
    await api.payBill(id);
    load();
  };

  const unpaid = bills.filter((b) => !b.paid).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const paid = bills.filter((b) => b.paid);

  return (
    <div className="space-y-6">
      <PageHeader icon={CalendarClock} eyebrow="Stay On Track" title="Bills & EMI Reminders" color="rose" />

      <form onSubmit={submit} className="glass-card p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500">Bill name</label>
          <input className="input-field" placeholder="e.g. Electricity" required
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Amount ($)</label>
          <input type="number" step="0.01" min="0.01" required className="input-field"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Due date</label>
          <input type="date" required className="input-field"
            value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Recurring</label>
          <select className="input-field" value={recurring} onChange={(e) => setRecurring(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
            <option value="one-time">One-time</option>
          </select>
        </div>
        <button className="btn-primary">Add Bill</button>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="glass-card p-5">
        <p className="font-semibold mb-3">Unpaid Bills</p>
        {unpaid.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing unpaid — you are all caught up!</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {unpaid.map((b) => {
              const days = daysUntil(b.due_date);
              const overdue = days < 0;
              const soon = days >= 0 && days <= 3;
              return (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {overdue ? (
                      <AlertTriangle size={18} className="text-red-500" />
                    ) : soon ? (
                      <Clock size={18} className="text-amber-500" />
                    ) : (
                      <Clock size={18} className="text-slate-300" />
                    )}
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className={`text-xs ${overdue ? "text-red-500" : soon ? "text-amber-500" : "text-slate-400"}`}>
                        {overdue
                          ? `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
                          : days === 0
                          ? "Due today"
                          : `Due in ${days} day${days === 1 ? "" : "s"} (${b.due_date})`}
                        {" · "}{b.recurring}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatMoney(b.amount)}</span>
                    <button onClick={() => pay(b.id)} className="btn-secondary text-xs py-1.5">Mark Paid</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {paid.length > 0 && (
        <div className="glass-card p-5">
          <p className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" /> Paid
          </p>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {paid.map((b) => (
              <li key={b.id} className="flex justify-between py-2 text-sm text-slate-400">
                <span>{b.name}</span>
                <span>{formatMoney(b.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
