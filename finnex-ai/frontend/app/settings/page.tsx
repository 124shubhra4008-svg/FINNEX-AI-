"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, CheckCircle2 } from "lucide-react";
import { api, isLoggedIn } from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";
import PageHeader from "@/components/PageHeader";

type CountryOption = { country: string; currency: string; symbol: string };

export default function SettingsPage() {
  const router = useRouter();
  const { currency, symbol, rate, source, refresh } = useCurrency();
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [selected, setSelected] = useState("USD");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api.getCountries().then(setCountries).catch((e) => setError(e.message));
  }, [router]);

  useEffect(() => {
    setSelected(currency);
  }, [currency]);

  const save = async () => {
    setError("");
    setSaved(false);
    try {
      await api.updateCurrency(selected);
      refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader icon={Globe} eyebrow="Preferences" title="Settings" color="purple" />

      <div className="glass-card p-5">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <Globe size={16} className="text-brand" /> Currency & Country
        </p>
        <p className="text-sm text-slate-400 mb-4">
          Choose your country to display all amounts in your local currency.
          Data is always stored in USD; this only changes how it's shown.
        </p>

        <select className="input-field mb-3" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {countries.map((c) => (
            <option key={c.currency} value={c.currency}>
              {c.country} ({c.currency} {c.symbol})
            </option>
          ))}
        </select>

        <button onClick={save} className="btn-primary w-full flex items-center justify-center gap-2">
          {saved ? <><CheckCircle2 size={16} /> Saved!</> : "Save Currency"}
        </button>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-slate-400">
          Current rate: 1 USD = {symbol}{rate.toFixed(2)} {currency}
          {source === "fallback" && (
            <span className="block mt-1 text-amber-500">
              Using an approximate offline rate (live rate service unreachable).
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
