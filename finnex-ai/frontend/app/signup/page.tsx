"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Rocket, Sparkles } from "lucide-react";
import { api, setToken } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.signup(name, email, password);
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
        <h1 className="text-3xl font-bold tracking-tight mb-3">Start your financial wellness journey</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm flex items-start gap-2">
          <Sparkles size={16} className="text-brand mt-1 shrink-0" />
          Free, works instantly offline, and upgrades automatically to full AI mode if you add an API key later.
        </p>
      </div>

      <div className="glass-card p-8 max-w-sm w-full mx-auto">
        <h2 className="text-xl font-bold mb-1">Create your account</h2>
        <p className="text-sm text-slate-400 mb-6">Takes less than a minute</p>
        <form onSubmit={submit} className="space-y-4">
          <input className="input-field" placeholder="Full name" required
            value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-field" type="email" placeholder="Email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input-field" type="password" placeholder="Password (min 6 chars)" required minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-slate-500">
          Already have an account? <Link href="/login" className="text-brand font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}
