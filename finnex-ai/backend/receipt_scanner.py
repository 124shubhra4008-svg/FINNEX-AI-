"""
receipt_scanner.py
Extracts merchant, amount, and date from a photo of a receipt.

OCR engine:
- Tesseract OCR (primary, no API key required)
- Gemini/OpenAI are optional fallbacks
"""

import os
import re
import base64
import json
import io
from datetime import datetime

import pytesseract
from PIL import Image

# Explicit Windows Tesseract path.
# This makes the scanner work even if Tesseract is not in PATH.
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


AMOUNT_PATTERN = re.compile(r"(\d+[.,]\d{2})")


def _try_tesseract(image_bytes: bytes) -> dict | None:
    """Extract receipt information using local Tesseract OCR."""

    try:
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB so different image formats work reliably.
        image = image.convert("RGB")

        raw_text = pytesseract.image_to_string(
            image,
            config="--psm 6",
        )

        print("Tesseract OCR text:")
        print(raw_text)

        if not raw_text.strip():
            print("Tesseract returned no text.")
            return None

        # ---------------------------------------------------------
        # Find final total
        # ---------------------------------------------------------

        amount = None

        total_patterns = [
            r"\bgrand\s*total\b\D{0,15}([0-9]+[.,][0-9]{2})",
            r"\btotal\s*amount\b\D{0,15}([0-9]+[.,][0-9]{2})",
            r"\btotal\b\D{0,15}([0-9]+[.,][0-9]{2})",
            r"\bamount\s*payable\b\D{0,15}([0-9]+[.,][0-9]{2})",
            r"\bnet\s*amount\b\D{0,15}([0-9]+[.,][0-9]{2})",
        ]

        lines = [
            line.strip()
            for line in raw_text.splitlines()
            if line.strip()
        ]

        for line in lines:
            # Ignore subtotal lines.
            if re.search(r"\bsub\s*total\b", line, re.IGNORECASE):
                continue

            for pattern in total_patterns:
                match = re.search(pattern, line, re.IGNORECASE)

                if match:
                    try:
                        amount = float(
                            match.group(1).replace(",", ".")
                        )
                        break
                    except ValueError:
                        pass

            if amount is not None:
                break

        # If a clearly labelled total was not found,
        # use the largest detected decimal amount.
        if amount is None:
            candidates = AMOUNT_PATTERN.findall(raw_text)

            values = []

            for candidate in candidates:
                try:
                    values.append(
                        float(candidate.replace(",", "."))
                    )
                except ValueError:
                    pass

            if values:
                amount = max(values)

        # ---------------------------------------------------------
        # Find date
        # ---------------------------------------------------------

        date_match = re.search(
            r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",
            raw_text,
        )

        if date_match:
            receipt_date = date_match.group(1)
        else:
            # Also support YYYY-MM-DD.
            iso_date_match = re.search(
                r"\b(\d{4}-\d{1,2}-\d{1,2})\b",
                raw_text,
            )

            if iso_date_match:
                receipt_date = iso_date_match.group(1)
            else:
                receipt_date = datetime.today().strftime("%Y-%m-%d")

        # ---------------------------------------------------------
        # Find merchant
        # ---------------------------------------------------------

        merchant = None

        # Ignore common non-merchant lines.
        ignored_words = [
            "receipt",
            "invoice",
            "tax invoice",
            "bill",
            "date",
            "time",
            "total",
            "subtotal",
            "amount",
            "gst",
            "cgst",
            "sgst",
            "cash",
            "change",
            "phone",
            "mobile",
        ]

        for line in lines[:8]:
            cleaned = line.strip()

            if len(cleaned) < 2:
                continue

            lower_line = cleaned.lower()

            if any(word == lower_line for word in ignored_words):
                continue

            # Skip lines that mainly contain numbers.
            if len(re.sub(r"[^0-9]", "", cleaned)) > len(cleaned) / 2:
                continue

            merchant = cleaned
            break

        return {
            "success": True,
            "merchant": merchant,
            "amount": amount,
            "date": receipt_date,
            "raw_text": raw_text[:2000],
            "source": "tesseract",
        }

    except Exception as e:
        print(
            f"Tesseract receipt scanner error: "
            f"{type(e).__name__}: {e}"
        )
        return None


def _try_gemini_vision(
    image_bytes: bytes,
    mime_type: str,
) -> dict | None:
    """Optional Gemini fallback."""

    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        prompt = (
            "This is a photo of a receipt. "
            "Extract the merchant name, final total amount, and date. "
            "Reply with ONLY a JSON object and no markdown. "
            'Use exactly this format: '
            '{"merchant": "", "amount": null, "date": ""}. '
            "Use the FINAL TOTAL, not the subtotal. "
            "If a field cannot be determined, use null."
        )

        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=mime_type,
        )

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[
                image_part,
                prompt,
            ],
        )

        text = response.text.strip()

        text = re.sub(
            r"^```json\s*|\s*```$",
            "",
            text.strip(),
            flags=re.MULTILINE,
        )

        data = json.loads(text)

        return {
            "success": True,
            "merchant": data.get("merchant"),
            "amount": (
                float(data["amount"])
                if data.get("amount") is not None
                else None
            ),
            "date": (
                data.get("date")
                or datetime.today().strftime("%Y-%m-%d")
            ),
            "raw_text": None,
            "source": "gemini",
        }

    except Exception as e:
        print(
            f"Gemini receipt scanner error: "
            f"{type(e).__name__}: {e}"
        )
        return None


def _try_openai_vision(
    image_bytes: bytes,
    mime_type: str,
) -> dict | None:
    """Optional OpenAI fallback."""

    api_key = os.environ.get("OPENAI_API_KEY")

    if not api_key:
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        b64 = base64.b64encode(image_bytes).decode()

        prompt = (
            "This is a photo of a receipt. "
            "Reply with ONLY a JSON object, no other text, "
            'in exactly this shape: '
            '{"merchant": "", "amount": null, "date": ""}. '
            "Use the FINAL TOTAL, not the subtotal. "
            "If a field cannot be determined, use null."
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt,
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": (
                                    f"data:{mime_type};base64,{b64}"
                                )
                            },
                        },
                    ],
                }
            ],
            max_tokens=200,
        )

        text = response.choices[0].message.content.strip()

        text = re.sub(
            r"^```json\s*|\s*```$",
            "",
            text,
            flags=re.MULTILINE,
        )

        data = json.loads(text)

        return {
            "success": True,
            "merchant": data.get("merchant"),
            "amount": (
                float(data["amount"])
                if data.get("amount") is not None
                else None
            ),
            "date": (
                data.get("date")
                or datetime.today().strftime("%Y-%m-%d")
            ),
            "raw_text": None,
            "source": "openai",
        }

    except Exception as e:
        print(
            f"OpenAI receipt scanner error: "
            f"{type(e).__name__}: {e}"
        )
        return None


def parse_receipt(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """
    Parse a receipt image.

    Tesseract is used FIRST, so no API key is required.
    Gemini/OpenAI are optional fallbacks if Tesseract
    cannot extract any text.
    """

    # ---------------------------------------------------------
    # 1. Tesseract OCR - primary scanner
    # ---------------------------------------------------------

    result = _try_tesseract(image_bytes)

    if result:
        return result

    # ---------------------------------------------------------
    # 2. Gemini - optional fallback
    # ---------------------------------------------------------

    result = _try_gemini_vision(
        image_bytes,
        mime_type,
    )

    if result:
        return result

    # ---------------------------------------------------------
    # 3. OpenAI - optional fallback
    # ---------------------------------------------------------

    result = _try_openai_vision(
        image_bytes,
        mime_type,
    )

    if result:
        return result

    # ---------------------------------------------------------
    # Nothing worked
    # ---------------------------------------------------------

    return {
        "success": False,
        "error": (
            "Receipt scanning failed. "
            "Tesseract OCR could not extract text from "
            "the uploaded receipt."
        ),
    }

