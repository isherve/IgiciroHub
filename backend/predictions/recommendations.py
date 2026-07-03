"""Natural-language recommendation generator for a prediction result."""
from __future__ import annotations


def build_recommendation(
    coffee_type_display: str,
    price_type_display: str,
    current_price: float,
    predicted_price: float,
    change_pct: float,
    horizon_days: int,
    currency: str,
    confidence: str,
) -> str:
    direction = "rise" if change_pct > 0 else "fall" if change_pct < 0 else "stay flat"
    mag = abs(change_pct)

    if change_pct >= 3:
        advice = (
            f"Prices are projected to {direction} by about {mag:.1f}% over the next "
            f"{horizon_days} days. If storage allows, holding your {coffee_type_display} "
            f"stock a little longer could improve returns."
        )
    elif change_pct <= -3:
        advice = (
            f"Prices are projected to {direction} by about {mag:.1f}% over the next "
            f"{horizon_days} days. Consider selling sooner or locking in a forward "
            f"agreement to protect your {price_type_display.lower()} income."
        )
    else:
        advice = (
            f"Prices are expected to {direction} (about {mag:.1f}%) over the next "
            f"{horizon_days} days. It is a stable window — sell based on your cash-flow needs."
        )

    conf_note = {
        "high": "Model confidence is high.",
        "medium": "Model confidence is moderate; monitor prices before deciding.",
        "low": "Model confidence is low; treat this as indicative only.",
    }.get(confidence, "")

    return f"{advice} {conf_note}".strip()
