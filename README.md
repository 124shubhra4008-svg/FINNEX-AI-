# 🚀 FINNEX AI+ — Intelligent Personal Finance & Financial Wellness Platform

A full working two-service app:

- **Backend**: FastAPI (Python) — auth, transactions, budgets, goals, bills,
  AI Financial Health Score, spending prediction, subscription detection,
  investment allocation suggestions, AI chatbot, Excel/CSV transaction import.
- **Frontend**: Next.js 14 + Tailwind + Recharts — dashboard, glassmorphism
  UI, dark mode, AI chat widget.
- **Database**: SQLite by default (zero setup). Swap to Supabase/Postgres
  in one file when you're ready for production (see step 8).
- **AI**: works fully offline out of the box (rule-based categorization +
  chatbot). Add a free Gemini API key or an OpenAI key to upgrade the
  chatbot and categorization to real LLM responses — no code changes needed.

This README is a complete, ordered tutorial: follow it top to bottom.

---

## 0. Prerequisites

- Python 3.10+ — check with `python3 --version`
- Node.js 18+ and npm — check with `node --version`
- (Optional) Node.js/npm already covers everything needed -- no other system-level dependencies required
- A code editor (PyCharm for the backend works great; VS Code is fine for
  the frontend, or use PyCharm Professional which supports JS/TS too)

Project layout:
```
finnex-ai/
├── backend/            # FastAPI service
│   ├── main.py          # app entrypoint & all routes
│   ├── database.py      # SQLite persistence
│   ├── auth.py          # password hashing + JWT
│   ├── models.py        # request/response schemas
│   ├── finance_engine.py # categorization, health score, prediction, subs
│   ├── ai_chat.py        # AI chatbot (Gemini/OpenAI/offline)
│   ├── transaction_import.py # Excel/CSV bulk transaction import
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
└── frontend/            # Next.js app
    ├── app/               # pages (dashboard, login, signup, etc.)
    ├── components/        # UI components
    ├── lib/api.ts          # API client
    ├── package.json
    └── .env.local.example
```

---

## 1. Open the backend in PyCharm

1. **File → Open** → select the `finnex-ai/backend` folder (open it as its
   own PyCharm project, separate from the frontend).
2. Create a virtual environment:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate        # Windows: venv\Scripts\activate
   ```
3. In PyCharm: **Settings → Project → Python Interpreter → Add → Existing
   environment** → point to `backend/venv/bin/python`.
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## 2. Configure backend environment variables

```bash
cp .env.example .env
```
Open `.env` and set a real `JWT_SECRET` (any long random string). Leave
`GEMINI_API_KEY` / `OPENAI_API_KEY` blank for now — the app works fully
without them.

Streamlit-style `.env` auto-loading isn't built into FastAPI/uvicorn, so
either:
- export the vars in your terminal before running: `export JWT_SECRET=...`, or
- install `python-dotenv` and add `from dotenv import load_dotenv; load_dotenv()`
  at the top of `main.py`, or
- set them as environment variables in a PyCharm Run Configuration.

## 3. Run the backend

```bash
uvicorn main:app --reload --port 8000
```
Visit **http://localhost:8000/docs** — this is FastAPI's auto-generated
interactive API explorer. You can test every endpoint here before touching
the frontend at all: sign up, get a token, click "Authorize" and paste
`Bearer <token>`, then try adding transactions.

The SQLite file `finnex.db` is created automatically on first run in the
`backend/` folder — no database setup needed.

## 4. Set up the frontend

Open a **second** terminal (keep the backend running):
```bash
cd finnex-ai/frontend
npm install
cp .env.local.example .env.local
```
`.env.local` should point at your backend:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 5. Run the frontend

```bash
npm run dev
```
Visit **http://localhost:3000**. You'll land on the dashboard, which
redirects to `/login` since you're not authenticated yet. Click "Sign up",
create an account, and you're in.

**To open both in PyCharm** (Professional edition supports JS projects):
open `finnex-ai/` (the parent folder) as one PyCharm project so you can see
both `backend/` and `frontend/` in the same project tree, and use two
terminal tabs to run each service.

## 6. Try the core flows

1. **Add transactions** (`/transactions`) — type a merchant like "Starbucks"
   and watch the category auto-fill via the keyword-based AI categorizer.
2. **Set budgets** (`/budgets`) — e.g. Groceries → $400/month.
3. **Add a savings goal** (`/goals`) — e.g. "Emergency Fund" → $5,000, then
   deposit some amount to it.
4. **Dashboard** (`/`) — see your Financial Health Score gauge, AI tips,
   income/expense charts, detected subscriptions, and upcoming bills.
5. **AI chat** — click the 💬 button bottom-right and ask "What's my health
   score?" or "How much will I spend this month?"

## 7. Enable full AI mode (optional but recommended)

Get a **free Gemini API key** at https://aistudio.google.com/apikey (or use
an OpenAI key if you prefer). Add it to `backend/.env`:
```
GEMINI_API_KEY=your-key-here
```
Restart the backend. The chatbot (`ai_chat.py`) will now use Gemini instead
of the offline rule engine, and can answer much more open-ended questions
about your finances.

## 8. Importing transactions from Excel/CSV

Already track expenses in a spreadsheet? Import it directly instead of
re-entering everything by hand.

1. Go to the **Dashboard** (if empty) or **Transactions** page.
2. Click **Download Template** to see the exact expected format, or just use
   your own file as long as it has at minimum a `Date` and `Amount` column.
3. Click **Import from Excel/CSV**, choose your file.
4. `.csv` works with zero extra setup. `.xlsx` requires `openpyxl`, already
   listed in `requirements.txt` -- just run `pip install -r requirements.txt`.

Optional columns (`Type`, `Category`, `Merchant`, `Description`) are
auto-filled if omitted: `Type` is guessed from whether the amount is
positive/negative, and `Category` is assigned by the same AI categorizer
used for manually-added transactions. Any row with a problem (bad date,
missing amount) is skipped and listed as a warning rather than failing the
whole import.

## 9. Receipt Scanner (AI vision — no separate program to install)

This was previously Tesseract-based, which required installing a separate
program on your computer and adding it to your system PATH — a common
source of setup failures, especially on Windows. It's now rebuilt to use AI
vision instead:

1. Get a **free** Gemini API key at https://aistudio.google.com/apikey
2. Add it to `backend/.env`: `GEMINI_API_KEY=your-key-here`
3. Restart the backend
4. Go to the **Receipt Scanner** page, upload a photo, click Scan

No Tesseract, no separate installer, no PATH configuration. If you'd
rather not use an API key, a local Tesseract fallback is still supported
(same install steps as before: `brew install tesseract` / `apt-get install
tesseract-ocr` / the Windows installer at
https://github.com/UB-Mannheim/tesseract/wiki) — the app tries Gemini
first, then OpenAI (if configured), then local Tesseract, and only shows
an error if none of the three are available.

## 10. Swapping SQLite for Supabase/Postgres (production)

The whole app talks to the database only through the plain-SQL functions in
`backend/database.py`. To move to Supabase:
1. Create a Supabase project and copy your Postgres connection string.
2. `pip install psycopg2-binary` (or `sqlalchemy`).
3. In `database.py`, replace `sqlite3.connect(DB_PATH)` with a
   `psycopg2.connect(SUPABASE_DB_URL)` inside `get_connection()`, and adjust
   the `CREATE TABLE` statements' SQLite-specific syntax (`AUTOINCREMENT` →
   `SERIAL`, etc.) to Postgres syntax.
4. Nothing else in the app needs to change — every route calls the same
   functions.

For Supabase Auth instead of the built-in JWT system, replace `auth.py`'s
signup/login with calls to `supabase.auth.sign_up()` /
`supabase.auth.sign_in_with_password()`, and verify the Supabase JWT on
each request instead of your own.

## 11. Deployment

### Backend → Render / Railway / Fly.io
- Push `backend/` to GitHub.
- Create a new Web Service, point it at the repo/`backend` subfolder.
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add environment variables (`JWT_SECRET`, optionally `GEMINI_API_KEY`).

Or with Docker (works on any host):
```bash
cd backend
docker build -t finnex-backend .
docker run -p 8000:8000 -e JWT_SECRET=... -e GEMINI_API_KEY=... finnex-backend
```

### Frontend → Vercel (recommended, made by the Next.js team)
1. Push `frontend/` to GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo,
   set the root directory to `frontend`.
3. Add environment variable `NEXT_PUBLIC_API_URL` = your deployed backend URL
   (e.g. `https://finnex-backend.onrender.com`).
4. Deploy. Vercel builds and hosts it automatically on every push.

**Important**: once both are deployed, update the backend's CORS
`allow_origins` in `main.py` from `["*"]` to your actual Vercel domain for
security.

## 12. What's implemented vs. what to extend

**Fully implemented & tested:**
Auth (signup/login/JWT), income & expense tracking (with **editing**), bank
account & wallet management with live per-account balances, AI
auto-categorization, budget planner with live adherence tracking, Financial
Health Score (5 weighted factors), month-end spending prediction, recurring
subscription detection, **concrete expense-reduction suggestions**, bill/EMI
tracking with a due-soon dashboard banner and optional email reminders,
savings goals with deposits and a completion celebration effect, investment
allocation suggestions (educational), **multi-currency display by country**
(live exchange rates with an offline fallback), AI chatbot (offline +
Gemini/OpenAI), one-click Excel/CSV transaction import (with a downloadable
template), **AI-vision-based receipt scanner** (Gemini/OpenAI, with a local
Tesseract fallback), reports with
CSV export and a category breakdown chart, dashboard with charts, dark mode,
glassmorphism UI.

**Currency notes:** all amounts are stored in the database in USD. The
`currency` preference (set in Settings) only changes how amounts are
*displayed* -- live exchange rates are fetched from the free
exchangerate.host API and cached for an hour; if that's unreachable (e.g. no
internet), a hardcoded fallback rate table in `backend/currency.py` is used
instead so the app never breaks, just shows an "approximate" note.

**Optional email bill reminders:** set `SMTP_HOST`, `SMTP_USER`,
`SMTP_PASSWORD` in `backend/.env` (Gmail users: use an App Password, not your
normal password), then call `POST /bills/reminders/send-emails` from a daily
cron job / scheduled task. Without SMTP configured, the in-app "due soon"
banner on the dashboard still works with zero setup.

**Stubbed / good next steps** (API patterns are already there to extend):
- A scheduler (APScheduler/cron) to auto-trigger `/bills/reminders/send-emails` daily.
- Reports export to PDF (CSV export already works).

---

## 13. Troubleshooting

- **CORS errors in the browser console**: make sure the backend is running
  and `NEXT_PUBLIC_API_URL` matches its actual address.
- **401 Unauthorized on every request**: your token may have expired (7 day
  default) — log out and log back in.
- **`ModuleNotFoundError` in the backend**: make sure your venv is activated
  and `pip install -r requirements.txt` completed without errors.
- **"Excel (.xlsx) support requires openpyxl"**: run
  `pip install -r requirements.txt` again (it's included), or save your file
  as `.csv` instead, which works with zero extra setup.
- **"Failed to fetch" on any page**: the backend server isn't running or
  isn't reachable at the address in `frontend/.env.local`. Start the backend
  first (`uvicorn main:app --reload --port 8000`), confirm
  `http://localhost:8000/docs` loads in a browser, then reload the frontend
  page — the newer pages will show a "Try Again" button once this is fixed.
