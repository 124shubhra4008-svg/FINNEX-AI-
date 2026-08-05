"""
receipt_scanner.py
Extracts merchant, amount, and date from a photo of a receipt.

Unlike a Tesseract-based approach, this uses the AI vision APIs (Gemini or
OpenAI) that the chatbot already supports -- no separate program needs to
be installed on the computer running the backend, which was the recurring
point of failure with local OCR (Tesseract not on PATH, wrong install,
Windows-specific issues, etc). If neither API key is configured, a
local Tesseract fallback is still attempted for anyone who has it set up,
and if that's unavailable too, a clear actionable message is returned
instead of crashing.
"""

import os
import re
import base64
import json
from datetime import datetime

AMOUNT_PATTERN = re.compile(r"(\d+[.,]\d{2})")


def _try_gemini_vision(image_bytes: bytes, mime_type: str) -> dict | None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            "This is a photo of a receipt. Reply with ONLY a JSON object, no other text, "
            "in exactly this shape: "
            '{"merchant": "<store name>", "amount": <final total as a number>, '
            '"date": "<YYYY-MM-DD>"}. '
            "Use the FINAL TOTAL, not the subtotal. If a field can't be determined, use null."
        )
        resp = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_bytes},
        ])
        text = resp.text.strip()
        text = re.sub(r"^```json\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
        data = json.loads(text)
        return {
            "success": True,
            "merchant": data.get("merchant"),
            "amount": float(data["amount"]) if data.get("amount") is not None else None,
            "date": data.get("date") or datetime.today().strftime("%Y-%m-%d"),
            "raw_text": None,
            "source": "gemini",
        }
    except Exception:
        return None


def _try_openai_vision(image_bytes: bytes, mime_type: str) -> dict | None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        b64 = base64.b64encode(image_bytes).decode()
        prompt = (
            "This is a photo of a receipt. Reply with ONLY a JSON object, no other text, "
            "in exactly this shape: "
            '{"merchant": "<store name>", "amount": <final total as a number>, '
            '"date": "<YYYY-MM-DD>"}. '
            "Use the FINAL TOTAL, not the subtotal. If a field can't be determined, use null."
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
                ],
            }],
            max_tokens=200,
        )
        text = resp.choices[0].message.content.strip()
        text = re.sub(r"^```json\s*|\s*```$", "", text, flags=re.MULTILINE)
        data = json.loads(text)
        return {
            "success": True,
            "merchant": data.get("merchant"),
            "amount": float(data["amount"]) if data.get("amount") is not None else None,
            "date": data.get("date") or datetime.today().strftime("%Y-%m-%d"),
            "raw_text": None,
            "source": "openai",
        }
    except Exception:
        return None


def _try_tesseract(image_bytes: bytes) -> dict | None:
    """Fallback for anyone who does have Tesseract installed locally."""
    try:
        import pytesseract
        from PIL import Image
        import io

        image = Image.open(io.BytesIO(image_bytes))
        raw_text = pytesseract.image_to_string(image)

        total_match = re.search(r"\btotal\b\D{0,10}(\d+[.,]\d{2})", raw_text, re.IGNORECASE)
        subtotal_check = re.search(r"\bsub\s*total\b", raw_text, re.IGNORECASE)
        amount = None
        for line in raw_text.splitlines():
            if subtotal_check and subtotal_check.group(0) in line:
                continue
            m = re.search(r"\btotal\b\D{0,10}(\d+[.,]\d{2})", line, re.IGNORECASE)
            if m:
                amount = float(m.group(1).replace(",", "."))
                break
        if amount is None:
            candidates = AMOUNT_PATTERN.findall(raw_text)
            amount = max((float(c) for c in candidates), default=None)

        date_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", raw_text)
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        merchant = lines[0] if lines else None

        return {
            "success": True,
            "merchant": merchant,
            "amount": amount,
            "date": date_match.group(1) if date_match else datetime.today().strftime("%Y-%m-%d"),
            "raw_text": raw_text[:1000],
            "source": "tesseract",
        }
    except Exception:
        return None


def parse_receipt(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """Tries AI vision first (Gemini, then OpenAI), then local Tesseract as a
    fallback. Returns a clear, actionable error if none are available --
    never crashes the request."""
    result = _try_gemini_vision(image_bytes, mime_type)
    if result:
        return result

    result = _try_openai_vision(image_bytes, mime_type)
    if result:
        return result

    result = _try_tesseract(image_bytes)
    if result:
        return result

    return {
        "success": False,
        "error": (
            "Receipt scanning needs either a free Gemini API key (recommended -- get one at "
            "https://aistudio.google.com/apikey, then add GEMINI_API_KEY to backend/.env and "
            "restart the backend) or a local Tesseract OCR install. No extra software installation "
            "is required for the Gemini option."
        ),
    }
