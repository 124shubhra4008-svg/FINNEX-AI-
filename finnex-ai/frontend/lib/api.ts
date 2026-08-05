// lib/api.ts
// Small fetch wrapper that attaches the JWT auth token and points at the
// FastAPI backend. Set NEXT_PUBLIC_API_URL in .env.local (see .env.local.example).

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("finnex_token");
}

export function setToken(token: string) {
  localStorage.setItem("finnex_token", token);
}

export function clearToken() {
  localStorage.removeItem("finnex_token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Request failed");
  }
  return res.json();
}

// Separate from `request()` because file uploads use FormData, not JSON --
// the browser needs to set its own multipart Content-Type with a boundary,
// so we must NOT set Content-Type manually here.
async function uploadFile(path: string, file: File, params?: Record<string, string>) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append("file", file);

  const query = params
    ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "")).toString()
    : "";

  const res = await fetch(`${API_URL}${path}${query}`, { method: "POST", headers, body: formData });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Upload failed");
  }
  return res.json();
}

export const api = {
  signup: (name: string, email: string, password: string) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  getDashboard: () => request("/insights/dashboard"),

  getTransactions: () => request("/transactions"),
  addTransaction: (data: object) =>
    request("/transactions", { method: "POST", body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: object) =>
    request(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => request(`/transactions/${id}`, { method: "DELETE" }),

  importTransactions: (file: File, accountId?: number) =>
    uploadFile("/transactions/import", file, accountId ? { account_id: String(accountId) } : undefined),
  getImportHistory: () => request("/transactions/import/history"),
  undoImport: (batchId: string) => request(`/transactions/import/${batchId}`, { method: "DELETE" }),

  getBudgets: () => request("/budgets"),
  setBudget: (category: string, monthly_limit: number) =>
    request("/budgets", { method: "POST", body: JSON.stringify({ category, monthly_limit }) }),

  getAccounts: () => request("/accounts"),
  addAccount: (data: object) => request("/accounts", { method: "POST", body: JSON.stringify(data) }),
  deleteAccount: (id: number) => request(`/accounts/${id}`, { method: "DELETE" }),

  getGoals: () => request("/goals"),
  addGoal: (data: object) => request("/goals", { method: "POST", body: JSON.stringify(data) }),
  depositToGoal: (id: number, amount: number) =>
    request(`/goals/${id}/deposit`, { method: "POST", body: JSON.stringify({ amount }) }),

  getBills: () => request("/bills"),
  addBill: (data: object) => request("/bills", { method: "POST", body: JSON.stringify(data) }),
  payBill: (id: number) => request(`/bills/${id}/pay`, { method: "PUT" }),
  getBillReminders: (withinDays = 7) => request(`/bills/reminders?within_days=${withinDays}`),

  getInvestmentPlan: () => request("/insights/investment"),
  getSavingsSuggestions: () => request("/insights/savings-suggestions"),
  updateRiskProfile: (risk_profile: string) =>
    request("/auth/risk-profile", { method: "PUT", body: JSON.stringify({ risk_profile }) }),

  getCountries: () => request("/currency/countries"),
  getCurrencyRate: () => request("/currency/rate"),
  updateCurrency: (currency: string) =>
    request("/auth/currency", { method: "PUT", body: JSON.stringify({ currency }) }),

  chat: (message: string) =>
    request("/chat", { method: "POST", body: JSON.stringify({ message }) }),

  scanReceipt: (file: File) => uploadFile("/receipts/scan", file),
};
