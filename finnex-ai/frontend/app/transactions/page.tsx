"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Check, X as XIcon, Trash2, Receipt, Upload, FileSpreadsheet, Undo2 } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import { categoryColor } from "@/lib/categoryColors";
import { useCurrency } from "@/lib/CurrencyContext";
import PageHeader from "@/components/PageHeader";

type Tx = {
  id: number;
  date: string;
  type: "income" | "expense";
  category: string;
  merchant: string | null;
  description: string;
  amount: number;
  account_id: number | null;
};

type Account = { id: number; name: string };

type ImportBatch = {
  batch_id: string;
  filename: string | null;
  count: number;
  net_amount: number;
  date_from: string;
  date_to: string;
  imported_at: string;
};

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "expense",
    merchant: "",
    description: "",
    amount: "",
    account_id: "",
  });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const { formatMoney } = useCurrency();

  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [importAccountId, setImportAccountId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.getTransactions().then(setTransactions).catch((e) => setError(e.message));
    api.getAccounts().then(setAccounts).catch(() => {});
    api.getImportHistory().then(setImports).catch(() => {});
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMessage("");
    setImportErrors([]);
    setError("");
    try {
      const result = await api.importTransactions(file, importAccountId ? parseInt(importAccountId) : undefined);
      setImportMessage(
        `Imported ${result.imported} transaction${result.imported === 1 ? "" : "s"} from "${result.filename}"` +
          (result.skipped ? ` — ${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped.` : ".")
      );
      setImportErrors(result.errors || []);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImport = async (batchId: string) => {
    if (!confirm("Remove every transaction from this imported file? This can't be undone.")) return;
    try {
      await api.undoImport(batchId);
      setImportMessage("Import removed — the rest of your data is unaffected.");
      setImportErrors([]);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.addTransaction({
        date: form.date,
        type: form.type,
        merchant: form.merchant || null,
        description: form.description,
        amount: parseFloat(form.amount),
        account_id: form.account_id ? parseInt(form.account_id) : null,
      });
      setForm({ ...form, merchant: "", description: "", amount: "" });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const remove = async (id: number) => {
    await api.deleteTransaction(id);
    load();
  };

  const startEdit = (t: Tx) => {
    setEditingId(t.id);
    setEditAmount(String(t.amount));
    setEditCategory(t.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    setError("");
    try {
      await api.updateTransaction(id, {
        amount: parseFloat(editAmount),
        category: editCategory,
      });
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const accountName = (id: number | null) => accounts.find((a) => a.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <PageHeader icon={Receipt} eyebrow="Manage" title="Transactions" color="rose" />

      <form onSubmit={submit} className="glass-card p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500">Date</label>
          <input type="date" className="input-field" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Type</label>
          <select className="input-field" value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Merchant</label>
          <input className="input-field" placeholder="e.g. Starbucks" value={form.merchant}
            onChange={(e) => setForm({ ...form, merchant: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Description</label>
          <input className="input-field" placeholder="Notes" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Amount ($)</label>
          <input type="number" step="0.01" min="0.01" required className="input-field" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Account</label>
          <select className="input-field" value={form.account_id}
            onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
            <option value="">None</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button className="btn-primary sm:col-span-6">Add Transaction (auto-categorized by AI)</button>
      </form>

      {accounts.length === 0 && (
        <p className="text-xs text-slate-400">
          Tip: <Link href="/accounts" className="text-brand">add a bank account or wallet</Link> to track balances per account.
        </p>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Import your own file (CSV statement export) */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-brand" />
          <h3 className="font-medium">Import your own file</h3>
        </div>
        <p className="text-xs text-slate-500">
          Upload a CSV export from your bank or wallet (Date + Amount, or Date + Debit/Credit — column
          names are matched automatically). Rows are auto-categorized just like manual entries.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="input-field w-auto"
            value={importAccountId}
            onChange={(e) => setImportAccountId(e.target.value)}
          >
            <option value="">No specific account</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelected}
            disabled={importing}
            className="hidden"
            id="import-file-input"
          />
          <label
            htmlFor="import-file-input"
            className={`btn-primary inline-flex items-center gap-2 cursor-pointer ${importing ? "opacity-60 pointer-events-none" : ""}`}
          >
            <Upload size={16} />
            {importing ? "Importing…" : "Choose CSV file"}
          </label>
        </div>

        {importMessage && <p className="text-sm text-emerald-600">{importMessage}</p>}
        {importErrors.length > 0 && (
          <ul className="text-xs text-amber-600 list-disc list-inside space-y-0.5">
            {importErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}

        {imports.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-slate-500 mb-2">Recent imports</p>
            <ul className="space-y-1.5">
              {imports.map((b) => (
                <li key={b.batch_id} className="flex items-center justify-between text-sm bg-black/5 rounded-lg px-3 py-2">
                  <span className="truncate">
                    <span className="font-medium">{b.filename || "Imported file"}</span>{" "}
                    <span className="text-slate-500 text-xs">
                      · {b.count} txn{b.count === 1 ? "" : "s"} · {b.date_from} – {b.date_to}
                    </span>
                  </span>
                  <button
                    onClick={() => removeImport(b.batch_id)}
                    className="text-slate-400 hover:text-red-500 inline-flex items-center gap-1 text-xs whitespace-nowrap ml-3"
                    title="Remove this entire import"
                  >
                    <Undo2 size={14} /> Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="glass-card p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-white/20">
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Merchant</th>
              <th>Description</th>
              <th>Account</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const isEditing = editingId === t.id;
              return (
                <tr key={t.id} className="border-b border-white/10">
                  <td className="py-2">{t.date}</td>
                  <td className={t.type === "income" ? "text-green-500" : "text-red-500"}>{t.type}</td>
                  <td>
                    {isEditing ? (
                      <input className="input-field text-xs py-1" value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)} />
                    ) : (
                      <span className={`category-badge ${categoryColor(t.category)}`}>{t.category}</span>
                    )}
                  </td>
                  <td>{t.merchant || "—"}</td>
                  <td>{t.description || "—"}</td>
                  <td>{accountName(t.account_id)}</td>
                  <td className="text-right">
                    {isEditing ? (
                      <input type="number" step="0.01" className="input-field text-xs py-1 w-24 text-right"
                        value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                    ) : (
                      formatMoney(t.amount)
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(t.id)} className="text-emerald-500 hover:text-emerald-600 mr-2">
                          <Check size={16} />
                        </button>
                        <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
                          <XIcon size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(t)} className="text-slate-400 hover:text-brand mr-2">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <div className="empty-state">
            <Receipt size={28} className="mb-3 opacity-30" />
            <p className="text-sm">No transactions yet — add your first one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
