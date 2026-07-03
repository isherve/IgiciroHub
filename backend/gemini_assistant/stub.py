"""
Offline assistant replies when GEMINI_API_KEY is not set.

Uses real data from the database (prices, marketplace listings) so the
assistant is still useful during development and demos without a paid API key.
"""
from __future__ import annotations

from prices.constants import CoffeeType
from prices.models import CoffeePrice
from crops.models import CropListing


def _detect_lang(message: str, locale: str) -> str:
    if locale in ("rw", "fr", "en"):
        base = locale
    else:
        base = "en"
    low = message.lower()
    # Simple Kinyarwanda cues.
    rw_words = ("muraho", "mwaramutse", "amakawa", "ikawa", "ibiciro", "mufite", "izihe", "murakoze", "ni")
    if any(w in low for w in rw_words):
        return "rw"
    fr_words = ("bonjour", "prix", "café", "coopérative", "quel", "comment")
    if any(w in low for w in fr_words):
        return "fr"
    return base


def _coffee_types_text() -> str:
    return ", ".join(label for _, label in CoffeeType.choices)


def _trending_summary() -> list[str]:
    lines = []
    seen = set()
    for row in CoffeePrice.objects.order_by("-recorded_date")[:50]:
        key = (row.coffee_type, row.price_type)
        if key in seen:
            continue
        seen.add(key)
        lines.append(
            f"{dict(CoffeeType.choices).get(row.coffee_type, row.coffee_type)} "
            f"({row.price_type}): {row.market_price} {row.currency}"
        )
        if len(lines) >= 5:
            break
    return lines


def _marketplace_summary() -> list[str]:
    return [
        f"{l.get_coffee_type_display()} — {l.quantity_kg} kg @ {l.price_per_kg} {l.currency}/kg ({l.cooperative.cooperative_name})"
        for l in CropListing.objects.filter(is_available=True).select_related("cooperative")[:5]
    ]


def stub_reply(message: str, locale: str = "en") -> str:
    lang = _detect_lang(message, locale)
    low = message.lower().strip()
    types = _coffee_types_text()
    trends = _trending_summary()
    listings = _marketplace_summary()

    # --- Kinyarwanda -------------------------------------------------------
    if lang == "rw":
        if any(w in low for w in ("izihe", "amakawa", "ikawa", "mufite", "ubwoko")):
            market = "\n".join(f"• {m}" for m in listings) if listings else "Nta bisobanuro byihari."
            return (
                f"Turafite ubwoko bw'ikawa bukurikira: {types}.\n\n"
                f"Ku isoko (Marketplace), dufite:\n{market}\n\n"
                "Reba tab ya Market cyangwa Prices kugira ngo ubone ibiciro byuzuye. "
                "Kuri tegura igiciro, kanda AI Predict."
            )
        if any(w in low for w in ("igiciro", "ibiciro", "biciro")):
            if trends:
                body = "\n".join(f"• {t}" for t in trends)
                return f"Ibiciro bya vuba:\n{body}\n\nReba tab ya Prices cyangwa AI Predict kugira ngo ubone ibisobanuro birambuye."
            return "Reba tab ya Prices cyangwa AI Predict kugira ngo ubone ibiciro n'iteganyagihe."
        return (
            "Muraho! Ndi umufasha wa IgiciroHub. Nshobora kukubwira ku bwoko bw'ikawa, "
            "ibiciro, n'isoko. Baza uti: 'mufite izihe kawa?' cyangwa 'ibiciro bya vuba ni ibihe?'"
        )

    # --- French ------------------------------------------------------------
    if lang == "fr":
        if any(w in low for w in ("variété", "type", "quel café", "quels cafés")):
            market = "\n".join(f"• {m}" for m in listings) if listings else "Aucune annonce pour le moment."
            return (
                f"Nous suivons ces variétés : {types}.\n\n"
                f"Sur le marché :\n{market}\n\n"
                "Consultez l'onglet Market ou Prices pour plus de détails."
            )
        if any(w in low for w in ("prix", "coût", "tarif")):
            if trends:
                body = "\n".join(f"• {t}" for t in trends)
                return f"Prix récents :\n{body}\n\nVoir l'onglet AI Predict pour une prévision."
            return "Consultez l'onglet Prices ou AI Predict pour les prix et prévisions."
        return (
            "Bonjour ! Je suis l'assistant IgiciroHub. Demandez-moi les variétés de café, "
            "les prix ou le marché."
        )

    # --- English (default) -------------------------------------------------
    if any(w in low for w in ("coffee type", "variety", "varieties", "what coffee", "which coffee")):
        market = "\n".join(f"• {m}" for m in listings) if listings else "No active listings right now."
        return (
            f"We track these coffee types: {types}.\n\n"
            f"On the marketplace:\n{market}\n\n"
            "Open the Market tab to browse, or AI Predict for price forecasts."
        )
    if any(w in low for w in ("price", "cost", "trend", "forecast", "predict")):
        if trends:
            body = "\n".join(f"• {t}" for t in trends)
            return f"Recent prices:\n{body}\n\nUse the AI Predict tab for a full forecast with confidence range."
        return "Check the Prices and AI Predict tabs for current and forecast coffee prices."
    if low in ("hi", "hello", "hey", "help"):
        return (
            "Hello! I'm the IgiciroHub assistant. Ask me about coffee varieties, "
            "current prices, or the marketplace — e.g. 'What coffee types do you have?'"
        )

    return (
        "I can help with coffee varieties, prices, and the marketplace. "
        "Try: 'What coffee types are available?' or 'What are current prices?' "
        "For full AI answers, your admin can add GEMINI_API_KEY to the server .env file."
    )
