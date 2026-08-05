import { Sparkles } from "lucide-react";

export default function HealthScoreGauge({
  score,
  rating,
}: {
  score: number;
  rating: string;
}) {
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#6C5CE7" : score >= 40 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card p-6 flex items-center gap-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ background: `radial-gradient(circle at 10% 20%, ${color}, transparent 60%)` }}
      />
      <svg width="128" height="128" viewBox="0 0 120 120" className="shrink-0 relative">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-white/10" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="800" fill="currentColor">
          {score}
        </text>
        <text x="60" y="76" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5">
          / 100
        </text>
      </svg>
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1">
          <Sparkles size={13} /> AI FINANCIAL HEALTH SCORE
        </div>
        <p className="text-2xl font-bold" style={{ color }}>{rating}</p>
        <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
          Calculated live from your savings rate, budgets, and spending consistency.
        </p>
      </div>
    </div>
  );
}
