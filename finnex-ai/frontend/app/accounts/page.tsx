"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Wallet, Banknote, CreditCard, Trash2 } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { useCurrency } from "@/lib/CurrencyContext";

type Account = {
  id: number;
  name: string;
  type: "bank" | "wallet" | "cash" | "credit_card";
  initial_balance: number;
  balance: number;
};

const TYPE_ICONS: Record<string, any> = {
  bank: Landmark,
  wallet: Wallet,
  cash: Banknote,
  credit_card: CreditCard,
};

const TYPE_LABELS: Record<string, string> = {
  bank: "Bank Account",
  wallet: "Digital Wallet",
  cash: "Cash",
  credit_card: "Credit Card",
};

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [initial, setInitial] = useState("");
  const [error, setError] = useState("");
  const { formatMoney } = useCurrency();

  const load = () => api.getAccounts().then(setAccounts).catch((e) => setError(e.message));

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
      await api.addAccount({ name, type, initial_balance: parseFloat(initial || "0") });
      setName("");
      setInitial("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const remove = async (id: number) => {
    await api.deleteAccount(id);
    load();
  };

  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <PageHeader icon={Landmark} eyebrow="Manage" title="Bank Accounts & Wallets" color="sky" />

      <div className="glass-card p-5">
        <p className="text-sm text-slate-400">Total Balance Across All Accounts</p>
        <p className="text-3xl font-bold text-brand mt-1">{formatMoney(total)}</p>
      </div>

      <form onSubmit={submit} className="glass-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500">Account name</label>
          <input className="input-field" placeholder="e.g. HDFC Savings" required
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Type</label>
          <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="bank">Bank Account</option>
            <option value="wallet">Digital Wallet</option>
            <option value="cash">Cash</option>
            <option value="credit_card">Credit Card</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Starting balance ($)</label>
          <input type="number" step="0.01" className="input-field" placeholder="0.00"
            value={initial} onChange={(e) => setInitial(e.target.value)} />
        </div>
        <button className="btn-primary">Add Account</button>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map((a) => {
          const Icon = TYPE_ICONS[a.type] || Landmark;
          return (
            <div key={a.id} className="glass-card p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Icon size={18} className="text-brand" />
                </div>
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-slate-400">{TYPE_LABELS[a.type]}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${a.balance < 0 ? "text-rose-500" : "text-emerald-500"}`}>
                  {formatMoney(a.balance)}
                </p>
                <button onClick={() => remove(a.id)} className="text-slate-400 hover:text-red-500 mt-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {accounts.length === 0 && <p className="text-slate-400 text-sm">No accounts yet — add your first one above.</p>}
      </div>
    </div>
  );
}
