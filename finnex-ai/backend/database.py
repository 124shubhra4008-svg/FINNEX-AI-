"""
database.py
SQLite persistence for FINNEX AI+.

Swap-out note: to move to Supabase/Postgres for production, replace the
sqlite3 connection in `get_connection()` with a psycopg2/SQLAlchemy
connection pointed at your Supabase DB URL. Every function below only
uses plain SQL, so the rest of the app does not need to change.
"""

import sqlite3
from contextlib import contextmanager
from datetime import datetime

DB_PATH = "finnex.db"


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_connection() as conn:
        c = conn.cursor()

        c.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                risk_profile TEXT DEFAULT 'moderate',
                currency TEXT DEFAULT 'USD',
                created_at TEXT NOT NULL
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'bank',
                initial_balance REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
                date TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
                category TEXT NOT NULL,
                merchant TEXT,
                description TEXT,
                amount REAL NOT NULL,
                is_recurring INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category TEXT NOT NULL,
                monthly_limit REAL NOT NULL,
                UNIQUE(user_id, category)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                target_amount REAL NOT NULL,
                saved_amount REAL NOT NULL DEFAULT 0,
                target_date TEXT
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                due_date TEXT NOT NULL,
                paid INTEGER DEFAULT 0,
                recurring TEXT DEFAULT 'monthly'
            )
        """)

        # --- Migrations for databases created before this column existed ---
        # SQLite has no "ADD COLUMN IF NOT EXISTS", so we try and ignore the
        # error if the column is already there. This keeps existing user
        # data intact when upgrading to a newer version of the app.
        try:
            c.execute("ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'USD'")
        except sqlite3.OperationalError:
            pass  # column already exists

        # Tags every transaction that came from a file import with a shared
        # batch id + the original filename, so an entire import can be
        # listed and undone (deleted) as one unit without touching manually
        # entered transactions.
        try:
            c.execute("ALTER TABLE transactions ADD COLUMN import_batch_id TEXT")
        except sqlite3.OperationalError:
            pass  # column already exists

        try:
            c.execute("ALTER TABLE transactions ADD COLUMN import_filename TEXT")
        except sqlite3.OperationalError:
            pass  # column already exists


# ---------------- Users ----------------

def create_user(email, name, password_hash, salt):
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO users (email, name, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)",
            (email, name, password_hash, salt, datetime.utcnow().isoformat()),
        )
        return cur.lastrowid


def get_user_by_email(email):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None


def set_risk_profile(user_id, risk_profile):
    with get_connection() as conn:
        conn.execute("UPDATE users SET risk_profile = ? WHERE id = ?", (risk_profile, user_id))


def set_currency(user_id, currency):
    with get_connection() as conn:
        conn.execute("UPDATE users SET currency = ? WHERE id = ?", (currency, user_id))


# ---------------- Transactions ----------------

def add_transaction(user_id, date, ttype, category, merchant, description, amount, is_recurring=0,
                     account_id=None, import_batch_id=None, import_filename=None):
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO transactions (user_id, account_id, date, type, category, merchant, description, "
            "amount, is_recurring, created_at, import_batch_id, import_filename) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, account_id, date, ttype, category, merchant, description, amount, is_recurring,
             datetime.utcnow().isoformat(), import_batch_id, import_filename),
        )
        return cur.lastrowid


def get_transactions(user_id):
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC", (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def update_transaction(user_id, tx_id, **fields):
    """Partial update — only fields actually passed in `fields` get changed.
    Allowed keys: date, type, category, merchant, description, amount, account_id."""
    allowed = {"date", "type", "category", "merchant", "description", "amount", "account_id"}
    updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
    if not updates:
        return
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [tx_id, user_id]
    with get_connection() as conn:
        conn.execute(
            f"UPDATE transactions SET {set_clause} WHERE id = ? AND user_id = ?", values
        )


def delete_transaction(user_id, tx_id):
    with get_connection() as conn:
        conn.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))


# ---------------- File Imports (bulk-imported transaction batches) ----------------

def get_import_batches(user_id):
    """Returns one row per past file import (most recent first), each with
    the transaction count, total amount, and date range it covers -- used to
    render the "Recent Imports" list and let a whole import be undone."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                import_batch_id AS batch_id,
                import_filename AS filename,
                COUNT(*) AS count,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net_amount,
                MIN(date) AS date_from,
                MAX(date) AS date_to,
                MAX(created_at) AS imported_at
            FROM transactions
            WHERE user_id = ? AND import_batch_id IS NOT NULL
            GROUP BY import_batch_id
            ORDER BY imported_at DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def delete_import_batch(user_id, batch_id):
    """Removes every transaction from one import in a single stroke (the
    'remove imported file' action). Manually-entered and other imports'
    transactions are untouched, so the rest of the app stays in working
    condition."""
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM transactions WHERE user_id = ? AND import_batch_id = ?",
            (user_id, batch_id),
        )
        return cur.rowcount


# ---------------- Budgets ----------------

def set_budget(user_id, category, monthly_limit):
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?) "
            "ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit = excluded.monthly_limit",
            (user_id, category, monthly_limit),
        )


def get_budgets(user_id):
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM budgets WHERE user_id = ?", (user_id,)).fetchall()
        return [dict(r) for r in rows]


# ---------------- Goals ----------------

def add_goal(user_id, name, target_amount, target_date=None):
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO goals (user_id, name, target_amount, saved_amount, target_date) "
            "VALUES (?, ?, ?, 0, ?)",
            (user_id, name, target_amount, target_date),
        )
        return cur.lastrowid


def update_goal_savings(user_id, goal_id, amount):
    with get_connection() as conn:
        conn.execute(
            "UPDATE goals SET saved_amount = saved_amount + ? WHERE id = ? AND user_id = ?",
            (amount, goal_id, user_id),
        )


def get_goals(user_id):
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM goals WHERE user_id = ?", (user_id,)).fetchall()
        return [dict(r) for r in rows]


# ---------------- Accounts (Bank/Wallet Management) ----------------

def add_account(user_id, name, acc_type, initial_balance=0.0):
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO accounts (user_id, name, type, initial_balance, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, name, acc_type, initial_balance, datetime.utcnow().isoformat()),
        )
        return cur.lastrowid


def get_accounts(user_id):
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM accounts WHERE user_id = ? ORDER BY id ASC", (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_account_balances(user_id):
    """Returns each account with its live balance = initial_balance + income - expense."""
    with get_connection() as conn:
        accounts = conn.execute("SELECT * FROM accounts WHERE user_id = ?", (user_id,)).fetchall()
        result = []
        for acc in accounts:
            acc = dict(acc)
            totals = conn.execute(
                "SELECT type, COALESCE(SUM(amount), 0) as total FROM transactions "
                "WHERE user_id = ? AND account_id = ? GROUP BY type",
                (user_id, acc["id"]),
            ).fetchall()
            income = sum(t["total"] for t in totals if t["type"] == "income")
            expense = sum(t["total"] for t in totals if t["type"] == "expense")
            acc["balance"] = round(acc["initial_balance"] + income - expense, 2)
            result.append(acc)
        return result


def delete_account(user_id, account_id):
    with get_connection() as conn:
        conn.execute("DELETE FROM accounts WHERE id = ? AND user_id = ?", (account_id, user_id))


# ---------------- Bills: due-soon query for reminders ----------------

def get_due_soon_bills(user_id, within_days=7):
    from datetime import timedelta
    today = datetime.utcnow().date()
    cutoff = today + timedelta(days=within_days)
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM bills WHERE user_id = ? AND paid = 0 AND due_date <= ? ORDER BY due_date ASC",
            (user_id, cutoff.isoformat()),
        ).fetchall()
        return [dict(r) for r in rows]




def add_bill(user_id, name, amount, due_date, recurring="monthly"):
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO bills (user_id, name, amount, due_date, recurring) VALUES (?, ?, ?, ?, ?)",
            (user_id, name, amount, due_date, recurring),
        )
        return cur.lastrowid


def get_bills(user_id):
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM bills WHERE user_id = ? ORDER BY due_date ASC", (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def mark_bill_paid(user_id, bill_id):
    with get_connection() as conn:
        conn.execute("UPDATE bills SET paid = 1 WHERE id = ? AND user_id = ?", (bill_id, user_id))
