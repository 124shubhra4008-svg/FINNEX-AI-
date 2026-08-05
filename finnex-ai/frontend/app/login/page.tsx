"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Rocket, ShieldCheck, BarChart3, Bot } from "lucide-react";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div className="hidden md:block">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-emerald-400 flex items-center justify-center mb-6">
          <Rocket size={26} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">FINNEX AI+</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
          An intelligent financial wellness platform that tracks, predicts, and
          coaches you toward better money habits.
        </p>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <BarChart3 size={18} className="text-brand mt-0.5" />
            <p className="text-sm text-slate-500 dark:text-slate-400">AI-driven Financial Health Score & spend predictions</p>
          </div>
          <div className="flex items-start gap-3">
            <Bot size={18} className="text-brand mt-0.5" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Built-in AI coach to answer your money questions</p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-brand mt-0.5" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Your data stays local — offline mode by default</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 max-w-sm w-full mx-auto">
        <h2 className="text-xl font-bold mb-1">Welcome back</h2>
        <p className="text-sm text-slate-400 mb-6">Log in to see your dashboard</p>
        <form onSubmit={submit} className="space-y-4">
          <input className="input-field" type="email" placeholder="Email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input-field" type="password" placeholder="Password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-slate-500">
          No account? <Link href="/signup" className="text-brand font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
