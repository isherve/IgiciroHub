"""
Gemini assistant via the native REST API (supports new AQ.* auth keys from AI Studio).
Falls back to database-backed stub answers when no key or all models fail.
"""
from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

SYSTEM_PROMPT = (
    "You are IgiciroHub's assistant for Rwandan coffee farmers and cooperatives. "
    "Answer briefly and practically about coffee farming, pricing, market access, "
    "quality and cooperatives. Use simple language. If asked in Kinyarwanda or "
    "French, reply in that language."
)

DISEASE_PROMPT = (
    "You are helping a Rwandan coffee farmer. Look at this coffee plant photo and, "
    "in plain simple language: (1) describe any visible symptoms, (2) name likely "
    "common causes (e.g. coffee leaf rust, coffee berry disease, nutrient deficiency, "
    "pests), and (3) give general care advice. Add a short note that this is not a "
    "certified diagnosis and they should consult a local agronomist."
)

# gemini-2.5-flash works on free tier with new AQ.* keys; older models often 404/429.
MODEL_FALLBACKS = (
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
)


def is_configured() -> bool:
    return bool(getattr(settings, "GEMINI_API_KEY", ""))


def _models_to_try():
    primary = getattr(settings, "GEMINI_MODEL", "") or MODEL_FALLBACKS[0]
    seen = set()
    for name in (primary, *MODEL_FALLBACKS):
        if name and name not in seen:
            seen.add(name)
            yield name


def _generate(model_name: str, content) -> str:
    """Call Gemini native REST API with x-goog-api-key (required for AQ.* keys)."""
    url = f"{GEMINI_API_BASE}/models/{model_name}:generateContent"
    headers = {
        "x-goog-api-key": settings.GEMINI_API_KEY,
        "Content-Type": "application/json",
    }

    if isinstance(content, str):
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": content}]}],
        }
    else:
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append({"text": item})
            elif isinstance(item, dict) and "data" in item:
                parts.append({"inline_data": {"mime_type": item["mime_type"], "data": item["data"]}})
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": parts}],
        }

    resp = requests.post(url, headers=headers, json=payload, timeout=45)
    if not resp.ok:
        raise RuntimeError(f"Gemini HTTP {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")
    parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned empty text")
    return text


from .stub import stub_reply


def get_status() -> dict:
    if not is_configured():
        return {
            "configured": False,
            "available": False,
            "mode": "offline",
            "message": "No GEMINI_API_KEY on server — using database answers.",
        }
    last_error = ""
    for model_name in _models_to_try():
        try:
            text = _generate(model_name, "Reply with exactly: OK")
            if text:
                return {
                    "configured": True,
                    "available": True,
                    "mode": "gemini",
                    "model": model_name,
                    "message": "Gemini AI is live.",
                }
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            logger.warning("Gemini status probe failed on %s: %s", model_name, exc)
    low = last_error.lower()
    if "429" in low or "quota" in low or "resource_exhausted" in low:
        message = "Gemini quota limited — using database answers."
        mode = "quota"
    else:
        message = f"Gemini unavailable. Using database answers."
        mode = "unavailable"
    return {
        "configured": True,
        "available": False,
        "mode": mode,
        "message": message,
    }


def ask(message: str, locale: str = "en") -> dict:
    if not is_configured():
        return {"reply": stub_reply(message, locale), "source": "stub"}
    last_error = None
    for model_name in _models_to_try():
        try:
            text = _generate(model_name, message)
            return {"reply": text, "source": "gemini", "model": model_name}
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("Gemini model %s failed: %s", model_name, exc)
    logger.exception("Gemini ask failed after all models: %s", last_error)
    return {
        "reply": stub_reply(message, locale),
        "source": "stub",
        "detail": "Gemini unavailable — showing offline answers.",
    }


def describe_disease(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    if not is_configured():
        return {
            "description": (
                "Photo-based disease description needs GEMINI_API_KEY configured. "
                "General tip: inspect leaves for orange-yellow powdery spots (leaf rust) "
                "or dark sunken lesions on berries (coffee berry disease), and consult "
                "your cooperative's agronomist."
            ),
            "source": "stub",
        }
    import base64

    b64 = base64.b64encode(image_bytes).decode("ascii")
    content = [
        DISEASE_PROMPT,
        {"mime_type": mime_type, "data": b64},
    ]
    last_error = None
    for model_name in _models_to_try():
        try:
            text = _generate(model_name, content)
            return {"description": text, "source": "gemini", "model": model_name}
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("Gemini disease model %s failed: %s", model_name, exc)
    logger.exception("Gemini disease detection failed: %s", last_error)
    return {"description": "Image analysis is temporarily unavailable.", "source": "error"}
