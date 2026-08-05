import { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = "text-brand",
  iconBg = "bg-brand/10",
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
  accent?: string;
  iconBg?: string;
}) {
  return (
    <div className="glass-card p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`text-2xl font-bold mt-1.5 ${accent}`}>{value}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon size={20} className={accent} />
        </div>
      )}
    </div>
  );
}
