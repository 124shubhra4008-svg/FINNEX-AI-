import { LucideIcon } from "lucide-react";

const GRADIENTS: Record<string, string> = {
  brand: "from-brand to-indigo-400",
  emerald: "from-emerald-400 to-teal-400",
  amber: "from-amber-400 to-orange-400",
  rose: "from-rose-400 to-pink-400",
  sky: "from-sky-400 to-cyan-400",
  purple: "from-purple-400 to-fuchsia-400",
};

export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  color = "brand",
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
  color?: keyof typeof GRADIENTS;
}) {
  return (
    <div className="relative overflow-hidden glass-card p-6">
      <div
        className={`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br ${GRADIENTS[color]} opacity-20 blur-2xl pointer-events-none`}
      />
      <div className="relative flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${GRADIENTS[color]} flex items-center justify-center shrink-0 shadow-lg shadow-brand/20`}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="section-label mb-0.5">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
