"""
finance_engine.py
The "AI" analytics core of FINNEX AI+:
  - keyword-based expense categorization (works offline, no API key needed)
  - Financial Health Score (0-100)
  - month-end spending prediction (simple linear trend, no heavy ML deps required)
  - recurring subscription detection
  - educational investment allocation suggestions

Kept dependency-light (pure Python + optionally numpy) so it runs anywhere,
including free-tier hosting with no build step for scikit-learn.
"""

from collections import defaultdict
from datetime import datetime, date
from statistics import mean

CATEGORY_KEYWORDS = {
    "Groceries": ["grocery", "supermarket", "walmart", "kroger", "aldi", "whole foods", "reliance fresh", "bigbasket"],
    "Dining": ["restaurant", "cafe", "coffee", "starbucks", "mcdonald", "pizza", "swiggy", "zomato", "doordash"],
    "Transport": ["uber", "ola", "lyft", "gas", "fuel", "parking", "metro", "bus", "train", "toll"],
    "Housing": ["rent", "mortgage", "landlord", "hoa"],
    "Utilities": ["electric", "water bill", "internet", "wifi", "phone bill", "gas bill", "utility"],
    "Entertainment": ["netflix", "spotify", "movie", "cinema", "hulu", "disney+", "prime video", "game", "concert"],
    "Shopping": ["amazon", "flipkart", "target", "mall", "clothing", "shoes", "electronics", "myntra"],
    "Health": ["pharmacy", "doctor", "hospital", "dentist", "gym", "insurance", "apollo", "medplus"],
    "Travel": ["flight", "airbnb", "hotel", "airline", "vacation", "makemytrip"],
    "Income": ["salary", "paycheck", "payroll", "deposit", "bonus", "freelance", "refund"],
    "Other": [],
}


def categorize(description: str, merchant: str, ttype: str) -> str:
    if ttype == "income":
        return "Income"
    text = f"{description or ''} {merchant or ''}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return category
    return "Other"


def _month_key(d: str) -> str:
    return d[:7]  # "YYYY-MM"


def monthly_totals(transactions: list) -> dict:
    """Returns {month: {'income': x, 'expense': y}}."""
    result = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    for t in transactions:
        m = _month_key(t["date"])
        result[m][t["type"]] += t["amount"]
    return dict(sorted(result.items()))


def financial_health_score(transactions: list, budgets: list, goals: list) -> dict:
    """
    Computes a 0-100 score from five weighted factors:
      - Savings ratio (30 pts): (income - expense) / income
      - Budget adherence (25 pts): % of budgeted categories within limit
      - Spending consistency (15 pts): lower month-to-month expense volatility is better
      - Emergency fund coverage (20 pts): total goal savings vs ~3x avg monthly expense
      - Debt/expense ratio proxy (10 pts): housing+utilities share of expense (lower is better)
    """
    totals = monthly_totals(transactions)
    months = list(totals.values())

    total_income = sum(m["income"] for m in months) or 0.0
    total_expense = sum(m["expense"] for m in months) or 0.0

    # 1. Savings ratio
    savings_ratio = ((total_income - total_expense) / total_income) if total_income else 0
    savings_score = max(0, min(30, savings_ratio * 30 / 0.3))  # 30% savings ratio = full marks

    # 2. Budget adherence (current month only, since limits are monthly)
    current_month_key = date.today().strftime("%Y-%m")
    if budgets:
        spent_by_cat = defaultdict(float)
        for t in transactions:
            if t["type"] == "expense" and _month_key(t["date"]) == current_month_key:
                spent_by_cat[t["category"]] += t["amount"]
        within = sum(1 for b in budgets if spent_by_cat.get(b["category"], 0) <= b["monthly_limit"])
        budget_score = (within / len(budgets)) * 25
    else:
        budget_score = 12.5  # neutral if no budgets set yet

    # 3. Spending consistency (lower stdev relative to mean = better)
    expense_series = [m["expense"] for m in months if m["expense"] > 0]
    if len(expense_series) >= 2:
        avg = mean(expense_series)
        variance = sum((x - avg) ** 2 for x in expense_series) / len(expense_series)
        stdev = variance ** 0.5
        volatility = (stdev / avg) if avg else 0
        consistency_score = max(0, 15 - min(15, volatility * 15))
    else:
        consistency_score = 10  # neutral, not enough history yet

    # 4. Emergency fund coverage
    avg_monthly_expense = mean(expense_series) if expense_series else 0
    total_saved = sum(g["saved_amount"] for g in goals)
    target_fund = avg_monthly_expense * 3
    fund_score = min(20, (total_saved / target_fund) * 20) if target_fund else 10

    # 5. Fixed-cost burden (housing + utilities share of expense; lower is healthier)
    fixed_cost = 0.0
    for t in transactions:
        if t["type"] == "expense" and t["category"] in ("Housing", "Utilities"):
            fixed_cost += t["amount"]
    fixed_ratio = (fixed_cost / total_expense) if total_expense else 0
    fixed_score = max(0, 10 - min(10, fixed_ratio * 10 / 0.5))  # 50%+ fixed cost = 0 pts

    score = round(savings_score + budget_score + consistency_score + fund_score + fixed_score)
    score = max(0, min(100, score))

    if score >= 80:
        rating = "Excellent"
    elif score >= 60:
        rating = "Good"
    elif score >= 40:
        rating = "Fair"
    else:
        rating = "Needs Attention"

    tips = []
    if savings_score < 15:
        tips.append("Your savings rate is low — try to save at least 20% of your income each month.")
    if budget_score < 15:
        tips.append("You're exceeding some of your budgets — review your top spending categories.")
    if fund_score < 10:
        tips.append("Build an emergency fund covering 3 months of expenses for better financial security.")
    if fixed_score < 5:
        tips.append("Fixed costs (housing/utilities) are a large share of spending — consider ways to reduce them.")
    if not tips:
        tips.append("Great job! Keep maintaining your current financial habits.")

    return {
        "score": score,
        "rating": rating,
        "breakdown": {
            "savings": round(savings_score, 1),
            "budget_adherence": round(budget_score, 1),
            "consistency": round(consistency_score, 1),
            "emergency_fund": round(fund_score, 1),
            "fixed_cost_burden": round(fixed_score, 1),
        },
        "tips": tips,
    }


def predict_month_end_expense(transactions: list) -> dict:
    """
    Predicts this month's total expense using a simple daily-run-rate projection,
    blended with the trend from prior months (no external ML dependency needed).
    """
    today = date.today()
    cur_month_key = today.strftime("%Y-%m")
    day_of_month = today.day
    days_in_month = 28 if today.month == 2 else (30 if today.month in (4, 6, 9, 11) else 31)

    totals = monthly_totals(transactions)
    current = totals.get(cur_month_key, {"expense": 0.0})["expense"]

    # Run-rate projection from days elapsed so far this month
    run_rate_projection = (current / day_of_month) * days_in_month if day_of_month else current

    # Trend from previous months (simple average of last up-to-3 completed months)
    past_months = [v["expense"] for k, v in totals.items() if k != cur_month_key]
    trend_projection = mean(past_months[-3:]) if past_months else run_rate_projection

    # Blend: weight recent run-rate more heavily once we're further into the month
    weight_current = min(1.0, day_of_month / days_in_month)
    predicted = run_rate_projection * weight_current + trend_projection * (1 - weight_current)

    return {
        "month": cur_month_key,
        "spent_so_far": round(current, 2),
        "predicted_month_end": round(predicted, 2),
        "days_elapsed": day_of_month,
        "days_in_month": days_in_month,
    }


def detect_subscriptions(transactions: list) -> list:
    """
    Flags recurring merchants: same merchant/description appearing in >=2 different
    months with similar amounts (±10%) is treated as a likely subscription.
    """
    groups = defaultdict(list)
    for t in transactions:
        if t["type"] != "expense":
            continue
        key = (t.get("merchant") or t.get("description") or "").strip().lower()
        if not key:
            continue
        groups[key].append(t)

    subscriptions = []
    for key, txs in groups.items():
        months = {_month_key(t["date"]) for t in txs}
        if len(months) < 2:
            continue
        amounts = [t["amount"] for t in txs]
        avg_amt = mean(amounts)
        if all(abs(a - avg_amt) / avg_amt <= 0.10 for a in amounts if avg_amt):
            subscriptions.append({
                "name": key.title(),
                "average_amount": round(avg_amt, 2),
                "occurrences": len(txs),
                "category": txs[0]["category"],
            })
    return sorted(subscriptions, key=lambda s: -s["average_amount"])


def expense_reduction_suggestions(transactions: list, budgets: list) -> list:
    """
    Analyzes spending to find concrete, actionable ways to cut costs.
    Returns a list of {title, detail, potential_monthly_savings} dicts,
    ordered by potential savings (largest first).
    """
    suggestions = []
    current_month_key = date.today().strftime("%Y-%m")

    # 1. Categories that are over budget this month
    spent_by_cat = defaultdict(float)
    for t in transactions:
        if t["type"] == "expense" and _month_key(t["date"]) == current_month_key:
            spent_by_cat[t["category"]] += t["amount"]

    for b in budgets:
        spent = spent_by_cat.get(b["category"], 0)
        over = spent - b["monthly_limit"]
        if over > 0:
            suggestions.append({
                "title": f"Cut back on {b['category']}",
                "detail": (
                    f"You've spent ${spent:.2f} against a ${b['monthly_limit']:.2f} budget this month "
                    f"-- ${over:.2f} over. Trimming a few purchases here would bring you back on track."
                ),
                "potential_monthly_savings": round(over, 2),
            })

    # 2. Recurring subscriptions -- often the easiest "invisible" cuts
    subs = detect_subscriptions(transactions)
    if subs:
        total_sub_cost = sum(s["average_amount"] for s in subs)
        if len(subs) >= 2:
            cheapest = min(subs, key=lambda s: s["average_amount"])
            suggestions.append({
                "title": f"Review your {len(subs)} recurring subscriptions",
                "detail": (
                    f"You're paying about ${total_sub_cost:.2f}/month across {len(subs)} recurring charges "
                    f"(e.g. {', '.join(s['name'] for s in subs[:3])}). Canceling just one you don't use, "
                    f"like {cheapest['name']} (${cheapest['average_amount']:.2f}/mo), adds up over a year."
                ),
                "potential_monthly_savings": round(cheapest["average_amount"], 2),
            })

    # 3. Highest non-essential spending category overall (Dining/Entertainment/Shopping)
    discretionary = {"Dining", "Entertainment", "Shopping"}
    disc_totals = defaultdict(float)
    for t in transactions:
        if t["type"] == "expense" and t["category"] in discretionary and _month_key(t["date"]) == current_month_key:
            disc_totals[t["category"]] += t["amount"]
    if disc_totals:
        top_cat, top_amt = max(disc_totals.items(), key=lambda x: x[1])
        # Only suggest if not already covered by an over-budget suggestion above
        if not any(top_cat in s["title"] for s in suggestions):
            potential = round(top_amt * 0.2, 2)  # suggest trimming 20% as a realistic target
            if potential > 0:
                suggestions.append({
                    "title": f"Trim discretionary {top_cat} spending",
                    "detail": (
                        f"{top_cat} is your top discretionary category this month at ${top_amt:.2f}. "
                        f"Cutting it by just 20% would save about ${potential:.2f}/month."
                    ),
                    "potential_monthly_savings": potential,
                })

    # 4. Fixed-cost burden (housing + utilities) if unusually high
    total_expense_this_month = sum(spent_by_cat.values())
    fixed = spent_by_cat.get("Housing", 0) + spent_by_cat.get("Utilities", 0)
    if total_expense_this_month and (fixed / total_expense_this_month) > 0.5:
        suggestions.append({
            "title": "Fixed costs are eating most of your budget",
            "detail": (
                f"Housing and utilities make up {fixed / total_expense_this_month * 100:.0f}% of your spending "
                f"this month. Consider renegotiating bills, switching providers, or reviewing your housing costs."
            ),
            "potential_monthly_savings": 0,  # variable, no specific number to promise
        })

    suggestions.sort(key=lambda s: -s["potential_monthly_savings"])
    return suggestions


def investment_allocation(risk_profile: str, monthly_surplus: float) -> dict:
    """
    Educational-only allocation suggestion based on risk profile.
    NOT financial advice — clearly labeled as such in the API response and UI.
    """
    allocations = {
        "conservative": {"Emergency Fund": 0.40, "Fixed Deposits": 0.35, "Mutual Funds (Debt)": 0.20, "Equity SIP": 0.05},
        "moderate":     {"Emergency Fund": 0.25, "Fixed Deposits": 0.20, "Mutual Funds (Debt)": 0.20, "Equity SIP": 0.35},
        "aggressive":   {"Emergency Fund": 0.15, "Fixed Deposits": 0.10, "Mutual Funds (Debt)": 0.15, "Equity SIP": 0.60},
    }
    profile = allocations.get(risk_profile, allocations["moderate"])
    breakdown = {k: round(monthly_surplus * v, 2) for k, v in profile.items()}
    return {
        "risk_profile": risk_profile,
        "monthly_surplus": round(monthly_surplus, 2),
        "suggested_allocation": breakdown,
        "disclaimer": "Educational suggestion only, not professional financial advice.",
    }
