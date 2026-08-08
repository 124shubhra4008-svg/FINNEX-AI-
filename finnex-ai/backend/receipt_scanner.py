"""
receipt_scanner.py
Extracts merchant, amount, and date from a photo of a receipt.
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
        print("Gemini receipt scanner: GEMINI_API_KEY is not set")
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        prompt = (
            "This is a photo of a receipt. "
            "Extract the merchant name, final total amount, and date. "
            "Reply with ONLY a JSON object and no markdown. "
            "Use exactly this format: "
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


def _try_openai_vision(image_bytes: bytes, mime_type: str) -> dict | None:
    api_key = os.environ.get("OPENAI_API_KEY")

    if not api_key:
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        b64 = base64.b64encode(image_bytes).decode()

        prompt = (
            "This is a photo of a receipt. Reply with ONLY a JSON object, "
            "no other text, in exactly this shape: "
            '{"merchant": "", "amount": null, "date": ""}. '
            "Use the FINAL TOTAL, not the subtotal. "
            "If a field can't be determined, use null."
        )

        resp = client.chat.completions.create(
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
                                "url": f"data:{mime_type};base64,{b64}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=200,
        )

        text = resp.choices[0].message.content.strip()

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


def _try_tesseract(image_bytes: bytes) -> dict | None:
    try:
        import pytesseract
        from PIL import Image
        import io

        image = Image.open(io.BytesIO(image_bytes))
        raw_text = pytesseract.image_to_string(image)

        subtotal_check = re.search(
            r"\bsub\s*total\b",
            raw_text,
            re.IGNORECASE,
        )

        amount = None

        for line in raw_text.splitlines():
            if subtotal_check and subtotal_check.group(0) in line:
                continue

            match = re.search(
                r"\btotal\b\D{0,10}(\d+[.,]\d{2})",
                line,
                re.IGNORECASE,
            )

            if match:
                amount = float(
                    match.group(1).replace(",", ".")
                )
                break

        if amount is None:
            candidates = AMOUNT_PATTERN.findall(raw_text)

            amount = max(
                (
                    float(c.replace(",", "."))
                    for c in candidates
                ),
                default=None,
            )

        date_match = re.search(
            r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            raw_text,
        )

        lines = [
            line.strip()
            for line in raw_text.splitlines()
            if line.strip()
        ]

        merchant = lines[0] if lines else None

        return {
            "success": True,
            "merchant": merchant,
            "amount": amount,
            "date": (
                date_match.group(1)
                if date_match
                else datetime.today().strftime("%Y-%m-%d")
            ),
            "raw_text": raw_text[:1000],
            "source": "tesseract",
        }

    except Exception as e:
        print(
            f"Tesseract receipt scanner error: "
            f"{type(e).__name__}: {e}"
        )
        return None


def parse_receipt(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    result = _try_gemini_vision(
        image_bytes,
        mime_type,
    )

    if result:
        return result

    result = _try_openai_vision(
        image_bytes,
        mime_type,
    )

    if result:
        return result

    result = _try_tesseract(image_bytes)

    if result:
        return result

    return {
        "success": False,
        "error": (
            "Receipt scanning failed. "
            "Please make sure GEMINI_API_KEY is configured "
            "on the backend, or install/configure Tesseract OCR."
        ),
    }
