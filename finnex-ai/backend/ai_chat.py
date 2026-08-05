"""
ai_chat.py
The AI Financial Coach chatbot.

Priority order:
  1. If GEMINI_API_KEY is set, use Google Gemini.
  2. Else if OPENAI_API_KEY is set, use OpenAI.
  3. Else, fall back to a rule-based offline engine so the app always works.

The model is only ever given a JSON summary of the user's own data plus a
system prompt restricting it to that data — never given free rein.
"""

import os
import json
from finance_engine import monthly_totals, financial_health_score, predict_month_end_expense

SYSTEM_PROMPT = (
    "You are FINNEX AI, a friendly and encouraging personal financial coach. "
    "Answer the user's question using ONLY the JSON financial data provided. "
    "Be concise (3-5 sentences), use concrete numbers from the data, and end with one "
    "practical, actionable tip. Never invent transactions or numbers not present in the data. "
    "You may give general financial education, but always state investment ideas are "
    "educational, not professional advice."
)


def _build_context(transactions, budgets, goals, bills):
    totals = monthly_totals(transactions)
    health = financial_health_score(transactions, budgets, goals)
    prediction = predict_month_end_expense(transactions)
    return {
        "monthly_totals": totals,
        "financial_health": health,
        "spending_prediction": prediction,
        "budgets": budgets,
        "goals": goals,
        "upcoming_bills": [b for b in bills if not b["paid"]][:10],
        "recent_transactions": transactions[:25],
    }


def _try_gemini(question, context):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=SYSTEM_PROMPT)
        resp = model.generate_content(
            f"My financial data:\n{json.dumps(context, default=str)}\n\nQuestion: {question}"
        )
        return resp.text.strip()
    except Exception:
        return None


def _try_openai(question, context):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"My financial data:\n{json.dumps(context, default=str)}\n\nQuestion: {question}"},
            ],
            max_tokens=400,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return None


def _offline_answer(question: str, context: dict) -> str:
    q = question.lower()
    health = context["financial_health"]
    prediction = context["spending_prediction"]

    if "health score" in q or "how am i doing" in q:
        return (
            f"Your Financial Health Score is {health['score']}/100 ({health['rating']}). "
            f"Top tip: {health['tips'][0]}"
        )
    if "predict" in q or "month-end" in q or "will i spend" in q:
        return (
            f"Based on your spending so far this month (${prediction['spent_so_far']:.2f} "
            f"through day {prediction['days_elapsed']}), you're projected to spend about "
            f"${prediction['predicted_month_end']:.2f} by month end."
        )
    if "budget" in q:
        budgets = context["budgets"]
        if not budgets:
            return "You haven't set any budgets yet. Add some in the Budgets section."
        return f"You have {len(budgets)} active budget categories. Check the Budgets page for a full breakdown."
    if ("save" in q or "goal" in q) and context["goals"]:
        g = context["goals"][0]
        pct = (g["saved_amount"] / g["target_amount"] * 100) if g["target_amount"] else 0
        return f"Your goal '{g['name']}' is {pct:.0f}% funded (${g['saved_amount']:.2f} of ${g['target_amount']:.2f})."
    if "bill" in q:
        bills = context["upcoming_bills"]
        if not bills:
            return "You have no unpaid upcoming bills tracked."
        names = ", ".join(f"{b['name']} (${b['amount']:.2f}, due {b['due_date']})" for b in bills[:5])
        return f"Upcoming bills: {names}"

    totals = context["monthly_totals"]
    if totals:
        latest_month = list(totals.keys())[-1]
        m = totals[latest_month]
        return (
            f"In {latest_month}, you earned ${m['income']:.2f} and spent ${m['expense']:.2f} "
            f"(net ${m['income'] - m['expense']:.2f}). Ask me about your health score, budgets, "
            f"goals, or spending predictions for more detail."
        )
    return "Add some transactions first, then I can give you personalized insights!"


def ask(question: str, transactions: list, budgets: list, goals: list, bills: list) -> str:
    context = _build_context(transactions, budgets, goals, bills)

    answer = _try_gemini(question, context)
    if answer:
        return answer

    answer = _try_openai(question, context)
    if answer:
        return answer

    return _offline_answer(question, context)
