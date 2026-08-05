"""
currency.py
Country -> currency mapping and exchange rate lookups.

All amounts are stored in the database in USD (the base currency). This
module converts USD to whatever currency the user has selected for display
purposes only -- it never changes what's stored.

Live rates come from the free, keyless exchangerate.host API. If that call
fails for any reason (no internet, API down, etc.), a hardcoded fallback
rate table is used instead so the app never breaks -- it just shows
slightly-stale rates with a "fallback" flag the frontend can surface.
"""

import time
import urllib.request
import json

# Country -> (currency code, symbol) for the selector shown in Settings.
COUNTRY_CURRENCIES = {
    "United States": ("USD", "$"),
    "India": ("INR", "\u20b9"),
    "United Kingdom": ("GBP", "\u00a3"),
    "European Union": ("EUR", "\u20ac"),
    "Japan": ("JPY", "\u00a5"),
    "Canada": ("CAD", "CA$"),
    "Australia": ("AUD", "A$"),
    "United Arab Emirates": ("AED", "AED"),
    "Singapore": ("SGD", "S$"),
    "China": ("CNY", "\u00a5"),
    "Brazil": ("BRL", "R$"),
    "South Africa": ("ZAR", "R"),
    "Mexico": ("MXN", "MX$"),
}

# Approximate fallback rates (1 USD = X currency), used only if the live
# API can't be reached. Update periodically -- these are not live-accurate.
FALLBACK_RATES = {
    "USD": 1.0,
    "INR": 83.5,
    "GBP": 0.79,
    "EUR": 0.92,
    "JPY": 156.0,
    "CAD": 1.37,
    "AUD": 1.52,
    "AED": 3.67,
    "SGD": 1.35,
    "CNY": 7.24,
    "BRL": 5.4,
    "ZAR": 18.3,
    "MXN": 18.0,
}

_rate_cache = {}  # currency_code -> (rate, fetched_at_timestamp)
CACHE_TTL_SECONDS = 3600  # 1 hour


def get_exchange_rate(currency_code: str) -> dict:
    """Returns {'rate': float, 'source': 'live'|'fallback', 'currency': code}.
    1 USD = `rate` units of `currency_code`."""
    currency_code = currency_code.upper()

    if currency_code == "USD":
        return {"rate": 1.0, "source": "live", "currency": "USD"}

    cached = _rate_cache.get(currency_code)
    if cached and (time.time() - cached[1]) < CACHE_TTL_SECONDS:
        return {"rate": cached[0], "source": "live", "currency": currency_code}

    try:
        url = f"https://api.exchangerate.host/latest?base=USD&symbols={currency_code}"
        with urllib.request.urlopen(url, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            rate = data["rates"][currency_code]
            _rate_cache[currency_code] = (rate, time.time())
            return {"rate": rate, "source": "live", "currency": currency_code}
    except Exception:
        fallback_rate = FALLBACK_RATES.get(currency_code, 1.0)
        return {"rate": fallback_rate, "source": "fallback", "currency": currency_code}


def symbol_for(currency_code: str) -> str:
    for _, (code, symbol) in COUNTRY_CURRENCIES.items():
        if code == currency_code.upper():
            return symbol
    return currency_code.upper()
