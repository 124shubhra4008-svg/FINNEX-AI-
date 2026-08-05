"""
transaction_import.py
Parses a user-uploaded CSV of transactions (e.g. a bank/wallet statement
export) into rows ready for `database.add_transaction`.

Kept dependency-light (stdlib `csv` only, no pandas) so it installs anywhere.

Supported layouts (column names are matched case-insensitively, with a few
common aliases per field -- headers can be in any order):

  date, type, category, merchant, description, amount
  date, description, amount                (amount: + income / - expense)
  date, description, debit, credit          (separate debit/credit columns)

Only `date` and an amount (or debit/credit) are required. Every other field
is optional and falls back to a sensible default -- unknown/blank category
is auto-categorized the same way manual entries are, via `finance_engine.categorize`.
"""

import csv
import io
from datetime import datetime

import finance_engine as fe

MAX_ROWS = 5000  # sanity cap so one bad file can't hang the request

DATE_ALIASES = ["date", "transaction date", "posted date", "posting date", "value date"]
TYPE_ALIASES = ["type", "transaction type", "txn type"]
CATEGORY_ALIASES = ["category"]
MERCHANT_ALIASES = ["merchant", "payee", "vendor", "name"]
DESCRIPTION_ALIASES = ["description", "details", "narration", "memo", "notes"]
AMOUNT_ALIASES = ["amount", "value"]
DEBIT_ALIASES = ["debit", "withdrawal", "withdrawals", "money out", "paid out"]
CREDIT_ALIASES = ["credit", "deposit", "deposits", "money in", "paid in"]

DATE_FORMATS = ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d-%m-%Y", "%m-%d-%Y", "%d %b %Y", "%b %d, %Y"]


def _find_column(fieldnames, aliases):
    lowered = {f.strip().lower(): f for f in fieldnames if f}
    for alias in aliases:
        if alias in lowered:
            return lowered[alias]
    return None


def _parse_date(raw):
    raw = (raw or "").strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _parse_amount(raw):
    if raw is None:
        return None
    cleaned = str(raw).strip().replace(",", "").replace("$", "").replace("₹", "")
    if cleaned in ("", "-"):
        return None
    negative = cleaned.startswith("(") and cleaned.endswith(")")
    if negative:
        cleaned = cleaned[1:-1]
    try:
        value = float(cleaned)
    except ValueError:
        return None
    return -value if negative else value


def parse_transactions_csv(file_bytes: bytes):
    """
    Returns (rows, errors):
      rows   -- list of dicts: {date, type, category, merchant, description, amount, is_recurring}
                ready to hand to database.add_transaction (category is filled in
                if the file didn't specify one, or specified something blank)
      errors -- list of human-readable strings, one per skipped row (1-indexed,
                matching the row number a spreadsheet app would show)
    Raises ValueError with a clear message if the file isn't usable at all
    (empty, no header, or missing every column we need).
    """
    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = file_bytes.decode("latin-1")
        except Exception:
            raise ValueError("Could not read the file — please upload a plain CSV export.")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("The file doesn't look like a CSV (no header row found).")

    date_col = _find_column(reader.fieldnames, DATE_ALIASES)
    if not date_col:
        raise ValueError(
            "Couldn't find a date column. Expected a header like 'Date', 'Transaction Date', or 'Posted Date'."
        )

    type_col = _find_column(reader.fieldnames, TYPE_ALIASES)
    category_col = _find_column(reader.fieldnames, CATEGORY_ALIASES)
    merchant_col = _find_column(reader.fieldnames, MERCHANT_ALIASES)
    description_col = _find_column(reader.fieldnames, DESCRIPTION_ALIASES)
    amount_col = _find_column(reader.fieldnames, AMOUNT_ALIASES)
    debit_col = _find_column(reader.fieldnames, DEBIT_ALIASES)
    credit_col = _find_column(reader.fieldnames, CREDIT_ALIASES)

    if not amount_col and not (debit_col or credit_col):
        raise ValueError(
            "Couldn't find an amount column. Expected a header like 'Amount', or separate 'Debit'/'Credit' columns."
        )

    rows, errors = [], []

    for i, raw_row in enumerate(reader, start=2):  # start=2: header is row 1
        if i - 1 > MAX_ROWS:
            errors.append(f"Stopped after {MAX_ROWS} rows — split large files into smaller ones.")
            break

        if not any((v or "").strip() for v in raw_row.values()):
            continue  # silently skip fully blank lines

        date = _parse_date(raw_row.get(date_col))
        if not date:
            errors.append(f"Row {i}: couldn't understand the date '{raw_row.get(date_col, '')}'.")
            continue

        ttype = None
        amount = None

        if amount_col:
            amount = _parse_amount(raw_row.get(amount_col))
            if amount is None:
                errors.append(f"Row {i}: couldn't understand the amount '{raw_row.get(amount_col, '')}'.")
                continue
            ttype = "income" if amount >= 0 else "expense"
            amount = abs(amount)
        else:
            debit = _parse_amount(raw_row.get(debit_col)) if debit_col else None
            credit = _parse_amount(raw_row.get(credit_col)) if credit_col else None
            if credit:
                ttype, amount = "income", abs(credit)
            elif debit:
                ttype, amount = "expense", abs(debit)
            else:
                errors.append(f"Row {i}: no debit or credit amount found.")
                continue

        if type_col and raw_row.get(type_col):
            explicit_type = raw_row[type_col].strip().lower()
            if explicit_type in ("income", "credit", "deposit"):
                ttype = "income"
            elif explicit_type in ("expense", "debit", "withdrawal"):
                ttype = "expense"

        if amount is None or amount <= 0:
            errors.append(f"Row {i}: amount must be greater than zero.")
            continue

        merchant = (raw_row.get(merchant_col) or "").strip() or None if merchant_col else None
        description = (raw_row.get(description_col) or "").strip() if description_col else ""
        category = (raw_row.get(category_col) or "").strip() if category_col else ""
        if not category:
            category = fe.categorize(description, merchant, ttype)

        rows.append({
            "date": date,
            "type": ttype,
            "category": category,
            "merchant": merchant,
            "description": description,
            "amount": round(amount, 2),
            "is_recurring": 0,
        })

    if not rows and not errors:
        raise ValueError("The file has a header but no data rows.")

    return rows, errors
