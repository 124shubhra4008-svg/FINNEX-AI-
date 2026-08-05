import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={22} className="text-rose-500" />
      </div>
      <p className="font-semibold mb-1">Couldn't load this page</p>
      <p className="text-sm text-slate-400 mb-5">
        {message === "Failed to fetch"
          ? "Couldn't reach the server. Make sure the backend is running (uvicorn main:app --reload)."
          : message}
      </p>
      <button onClick={onRetry} className="btn-primary inline-flex items-center gap-2">
        <RefreshCcw size={16} /> Try Again
      </button>
    </div>
  );
}
