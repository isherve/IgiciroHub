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


def is_configured() -> bool:
    return bool(getattr(settings, "GEMINI_API_KEY", ""))


def _model():
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(settings.GEMINI_MODEL, system_instruction=SYSTEM_PROMPT)


from .stub import stub_reply


def ask(message: str, locale: str = "en") -> dict:
    if not is_configured():
        return {"reply": stub_reply(message, locale), "source": "stub"}
    try:
        model = _model()
        resp = model.generate_content(message)
        return {"reply": resp.text, "source": "gemini"}
    except Exception:  # noqa: BLE001
        logger.exception("Gemini ask failed")
        return {"reply": "The assistant is temporarily unavailable. Please try again later.", "source": "error"}


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
    try:
        model = _model()
        resp = model.generate_content(
            [DISEASE_PROMPT, {"mime_type": mime_type, "data": image_bytes}]
        )
        return {"description": resp.text, "source": "gemini"}
    except Exception:  # noqa: BLE001
        logger.exception("Gemini disease detection failed")
        return {"description": "Image analysis is temporarily unavailable.", "source": "error"}
