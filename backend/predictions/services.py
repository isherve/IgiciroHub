"""Helpers that bridge the DB price history with the ML predictor."""
from __future__ import annotations

import json
from datetime import date

from prices.constants import Currency, PriceType
from prices.models import CoffeePrice

from .ml.config import COMPARISON_JSON
from .ml.dataset import ensure_dataset

_DATASET_START = date(2019, 1, 1)


def currency_for(price_type: str) -> str:
    return Currency.USD if price_type == PriceType.EXPORT else Currency.RWF


def _months_since_start(d: date) -> int:
    return (d.year - _DATASET_START.year) * 12 + (d.month - _DATASET_START.month)


def get_recent_prices(coffee_type: str, price_type: str, months: int):
    """
    Return (recent_prices_most_recent_first, last_month, last_month_index).
    Falls back to the synthetic dataset if the DB has no history yet.
    """
    qs = (
        CoffeePrice.objects.filter(coffee_type=coffee_type, price_type=price_type)
        .order_by("-recorded_date")[: max(months, 3)]
    )
    rows = list(qs)
    if len(rows) >= 3:
        prices = [float(r.market_price) for r in rows]
        last_date = rows[0].recorded_date
        return prices, last_date.month, _months_since_start(last_date)

    # Fallback: synthetic dataset.
    df = ensure_dataset()
    sub = df[(df["coffee_type"] == coffee_type) & (df["price_type"] == price_type)]
    sub = sub.sort_values("date")
    if sub.empty:
        raise ValueError(f"No price history for {coffee_type}/{price_type}.")
    tail = sub.tail(max(months, 3))
    prices = list(reversed(tail["price"].astype(float).tolist()))
    last_date = tail["date"].iloc[-1]
    last_date = last_date.date() if hasattr(last_date, "date") else last_date
    return prices, last_date.month, _months_since_start(last_date)


def accuracy_for(price_type: str) -> float | None:
    """Read the stored accuracy_rate of the production RF from the comparison file."""
    if not COMPARISON_JSON.exists():
        return None
    try:
        data = json.loads(COMPARISON_JSON.read_text())
    except (ValueError, OSError):
        return None
    group = "export" if price_type == PriceType.EXPORT else "farmgate"
    return data.get(group, {}).get("RandomForest", {}).get("accuracy_rate")
