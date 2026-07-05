"""
Thin wrapper around Google Gemini for the in-app assistant and photo-based
crop disease description. Degrades gracefully to a helpful offline stub when
no GEMINI_API_KEY is configured, so the app still works during development.
"""
from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

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

# Prefer 1.5 Flash first — better free-tier availability for new Google AI Studio keys.
MODEL_FALLBACKS = (
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
)


def is_configured() -> bool:
    return bool(getattr(settings, "GEMINI_API_KEY", ""))


def get_status() -> dict:
    """Report whether Gemini is configured and actually reachable."""
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
            resp = _generate(model_name, "Reply with exactly: OK")
            text = (getattr(resp, "text", None) or "").strip()
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
    if "quota" in low or "429" in low or "resource_exhausted" in low:
        message = (
            "Gemini key is set but Google free-tier quota is exhausted. "
            "Enable billing in Google AI Studio or wait and retry. Using database answers."
        )
        mode = "quota"
    else:
        message = f"Gemini unavailable ({last_error[:120]}). Using database answers."
        mode = "unavailable"
    return {
        "configured": True,
        "available": False,
        "mode": mode,
        "message": message,
    }


def _models_to_try():
    primary = getattr(settings, "GEMINI_MODEL", "") or MODEL_FALLBACKS[0]
    seen = set()
    for name in (primary, *MODEL_FALLBACKS):
        if name and name not in seen:
            seen.add(name)
            yield name


def _generate(model_name: str, content):
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(model_name, system_instruction=SYSTEM_PROMPT)
    return model.generate_content(content)


from .stub import stub_reply


def ask(message: str, locale: str = "en") -> dict:
    if not is_configured():
        return {"reply": stub_reply(message, locale), "source": "stub"}
    last_error = None
    for model_name in _models_to_try():
        try:
            resp = _generate(model_name, message)
            text = getattr(resp, "text", None) or str(resp)
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
    content = [DISEASE_PROMPT, {"mime_type": mime_type, "data": image_bytes}]
    last_error = None
    for model_name in _models_to_try():
        try:
            resp = _generate(model_name, content)
            text = getattr(resp, "text", None) or str(resp)
            return {"description": text, "source": "gemini", "model": model_name}
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("Gemini disease model %s failed: %s", model_name, exc)
    logger.exception("Gemini disease detection failed: %s", last_error)
    return {"description": "Image analysis is temporarily unavailable.", "source": "error"}
