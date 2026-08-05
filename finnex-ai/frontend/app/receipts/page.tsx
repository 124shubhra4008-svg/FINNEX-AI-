"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Check, RefreshCcw, AlertCircle, Sparkles } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import PageHeader from "@/components/PageHeader";

const CATEGORIES = [
  "Groceries", "Dining", "Transport", "Housing", "Utilities",
  "Entertainment", "Shopping", "Health", "Travel", "Other",
];

type ScanResult = {
  merchant: string | null;
  amount: number | null;
  date: string;
  source?: string;
};

export default function ReceiptsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [scanSource, setScanSource] = useState<string | null>(null);

  const [form, setForm] = useState({
    merchant: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    category: "Other",
  });
  const [hasResult, setHasResult] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
    }
  }, [router]);

  const onFileChosen = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setHasResult(false);
    setSaved(false);
    setError("");
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileChosen(file);
  };

  const scan = async () => {
    if (!selectedFile) return;
    setScanning(true);
    setError("");
    try {
      const result: ScanResult = await api.scanReceipt(selectedFile);
      setForm({
        merchant: result.merchant || "",
        amount: result.amount ? String(result.amount) : "",
        date: result.date || new Date().toISOString().slice(0, 10),
        category: "Other",
      });
      setScanSource(result.source || null);
      setHasResult(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const saveTransaction = async () => {
    setSaving(true);
    setError("");
    try {
      await api.addTransaction({
        date: form.date,
        type: "expense",
        merchant: form.merchant || null,
        description: `Receipt scan: ${form.merchant || "unknown merchant"}`,
        amount: parseFloat(form.amount),
        category: form.category,
      });
      setSaved(true);
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setHasResult(false);
        setSaved(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setHasResult(false);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        icon={ScanLine}
        eyebrow="Scan & Save"
        title="Receipt Scanner"
        subtitle="Upload a photo of a receipt — AI extracts the merchant, amount, and date for you to review before saving."
        color="emerald"
      />

      {!previewUrl ? (
        <label className="glass-card p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-0.5 transition-transform">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInput}
          />
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
            <ScanLine size={26} className="text-brand" />
          </div>
          <p className="font-medium mb-1">Tap to upload or take a photo</p>
          <p className="text-sm text-slate-400">JPG, PNG — a clear, well-lit photo works best</p>
        </label>
      ) : (
        <div className="glass-card p-5 space-y-4">
          <img src={previewUrl} alt="Receipt preview" className="w-full max-h-80 object-contain rounded-xl border border-white/10" />

          {!hasResult && (
            <div className="flex gap-3">
              <button onClick={scan} disabled={scanning} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {scanning ? "Scanning..." : <><ScanLine size={16} /> Scan Receipt</>}
              </button>
              <button onClick={reset} className="btn-secondary">Choose Different Photo</button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {hasResult && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                Review the extracted details before saving:
                {scanSource && (
                  <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={11} /> {scanSource === "tesseract" ? "local OCR" : scanSource}
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Merchant</label>
                  <input className="input-field" value={form.merchant}
                    onChange={(e) => setForm({ ...form, merchant: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Amount ($)</label>
                  <input type="number" step="0.01" className="input-field" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Date</label>
                  <input type="date" className="input-field" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Category</label>
                  <select className="input-field" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveTransaction}
                  disabled={saving || !form.amount}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saved ? <><Check size={16} /> Saved!</> : saving ? "Saving..." : <><Check size={16} /> Save as Transaction</>}
                </button>
                <button onClick={reset} className="btn-secondary flex items-center gap-2">
                  <RefreshCcw size={14} /> Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
