"""
Runtime prediction: loads the pickled pipelines and produces a point estimate
plus a prediction interval derived from the spread across the Random Forest's
individual trees (10th–90th percentile).
"""
from __future__ import annotations

import math
from functools import lru_cache

import joblib
import numpy as np

from .config import EXPORT_PRICE_TYPES, MODEL_EXPORT, MODEL_FARMGATE
from .features import build_inference_row


class ModelNotTrained(Exception):
    pass


@lru_cache(maxsize=2)
def _load(path_str: str):
    from pathlib import Path

    path = Path(path_str)
    if not path.exists():
        raise ModelNotTrained(
            f"Model file {path.name} not found. Run `python manage.py train_model` first."
        )
    return joblib.load(path)


def _model_for(price_type: str):
    if price_type in EXPORT_PRICE_TYPES:
        return _load(str(MODEL_EXPORT))
    return _load(str(MODEL_FARMGATE))


def clear_cache():
    _load.cache_clear()


def _season_for_month(month: int) -> str:
    if 3 <= month <= 7:
        return "main_harvest"
    if 9 <= month <= 12:
        return "fly_crop"
    return "off_season"


def predict(
    coffee_type: str,
    price_type: str,
    recent_prices: list[float],
    horizon_days: int,
    last_month: int,
    last_month_index: int,
) -> dict:
    """
    `recent_prices` is most-recent-first (at least 1 value; ideally >=3).
    Produces an iterative monthly forecast for the requested horizon and
    returns point estimate + 10th/90th-percentile interval from tree spread.
    """
    if not recent_prices:
        raise ValueError("recent_prices must contain at least one value.")

    pipe = _model_for(price_type)
    rf = pipe.named_steps["model"]
    pre = pipe.named_steps["pre"]

    steps = max(1, math.ceil(horizon_days / 30))
    history = list(recent_prices)  # most-recent-first
    month = last_month
    month_index = last_month_index

    point = history[0]
    tree_preds = None

    for _ in range(steps):
        month = month + 1 if month < 12 else 1
        month_index += 1
        season = _season_for_month(month)
        row = build_inference_row(
            recent_prices=history[:3],
            coffee_type=coffee_type,
            price_type=price_type,
            season=season,
            month=month,
            month_index=month_index,
        )
        Xt = pre.transform(row)
        # Individual tree predictions for the interval.
        tree_preds = np.array([est.predict(Xt)[0] for est in rf.estimators_])
        point = float(tree_preds.mean())
        history.insert(0, point)  # feed back as the newest lag

    low = float(np.percentile(tree_preds, 10))
    high = float(np.percentile(tree_preds, 90))
    current = float(recent_prices[0])
    change_pct = ((point - current) / current * 100) if current else 0.0

    # Confidence label from interval width relative to point estimate.
    rel_width = (high - low) / point if point else 1.0
    if rel_width < 0.05:
        confidence = "high"
    elif rel_width < 0.12:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "predicted_price": round(point, 2),
        "predicted_price_low": round(min(low, point), 2),
        "predicted_price_high": round(max(high, point), 2),
        "current_price": round(current, 2),
        "change_pct": round(change_pct, 2),
        "confidence": confidence,
        "method": "random_forest",
        "horizon_days": horizon_days,
        "steps_ahead_months": steps,
    }
