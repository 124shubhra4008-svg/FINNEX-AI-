"""
notifications.py
Optional email reminders for upcoming bills/EMIs.

This is opt-in: if SMTP_HOST/SMTP_USER/SMTP_PASSWORD aren't set, sending is
skipped and the caller gets a clear "not configured" result instead of an
error. The in-app "due soon" banner (GET /bills/reminders) always works with
zero configuration -- email is an extra layer for real-world deployments.

To actually send reminders automatically, call `send_due_bill_emails()` from
a scheduled job (cron, APScheduler, or a hosting provider's cron feature)
once a day.
"""

import os
import smtplib
from email.mime.text import MIMEText

import database as db


def _smtp_configured() -> bool:
    return all(os.environ.get(k) for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"))


def send_email(to_email: str, subject: str, body: str) -> bool:
    if not _smtp_configured():
        return False

    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to_email

    with smtplib.SMTP(host, port) as server:
        server.starttls()
        server.login(user, password)
        server.sendmail(user, [to_email], msg.as_string())
    return True


def send_due_bill_emails(within_days: int = 3) -> dict:
    """Sends one email per user who has bills due within `within_days` days.
    Intended to be triggered by a daily cron job hitting an admin endpoint,
    or run directly as a script. Returns a summary dict either way."""
    if not _smtp_configured():
        return {"sent": 0, "configured": False, "message": "SMTP not configured — see .env.example"}

    sent = 0
    # NOTE: for a small app this loops all users; for scale, add an index/query.
    with db.get_connection() as conn:
        users = conn.execute("SELECT id, email, name FROM users").fetchall()

    for user in users:
        bills = db.get_due_soon_bills(user["id"], within_days)
        if not bills:
            continue
        lines = [f"- {b['name']}: ${b['amount']:.2f} due {b['due_date']}" for b in bills]
        body = "Hi {}, you have upcoming bills:\n\n{}\n\n- FINNEX AI+".format(
            user["name"], "\n".join(lines)
        )
        if send_email(user["email"], "FINNEX AI+ — Upcoming bills reminder", body):
            sent += 1

    return {"sent": sent, "configured": True}
