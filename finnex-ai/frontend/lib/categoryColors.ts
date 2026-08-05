// lib/categoryColors.ts
// Consistent color coding for expense/income categories, used for badges
// in tables and charts across the app.

export const CATEGORY_COLORS: Record<string, string> = {
  Groceries: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Dining: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Transport: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  Housing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
  Utilities: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Entertainment: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
  Shopping: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  Health: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Travel: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Income: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  Other: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["Other"];
}
