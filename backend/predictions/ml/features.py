"""Time-series feature engineering shared by training and inference."""
from __future__ import annotations

import pandas as pd

from .config import CATEGORICAL_FEATURES, NUMERIC_FEATURES


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Given a long-format frame (date, coffee_type, price_type, price, season),
    add lagged prices, rolling averages and calendar features.

    Lags are computed *within* each (coffee_type, price_type) series ordered
    by date, so no cross-series leakage occurs.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["coffee_type", "price_type", "date"]).reset_index(drop=True)

    df["month"] = df["date"].dt.month
    # A monotonically increasing month index for trend (per series).
    df["month_index"] = (
        df.groupby(["coffee_type", "price_type"]).cumcount()
    )

    grp = df.groupby(["coffee_type", "price_type"])["price"]
    df["lag1"] = grp.shift(1)
    df["lag2"] = grp.shift(2)
    df["lag3"] = grp.shift(3)
    # Rolling mean of the previous 3 months, computed within each series.
    df["roll3"] = grp.transform(lambda s: s.shift(1).rolling(3).mean())

    # Drop rows that don't have full lag history.
    df = df.dropna(subset=["lag1", "lag2", "lag3", "roll3"]).reset_index(drop=True)
    return df


def feature_columns() -> list[str]:
    return NUMERIC_FEATURES + CATEGORICAL_FEATURES


def build_inference_row(recent_prices: list[float], coffee_type: str, price_type: str,
                        season: str, month: int, month_index: int) -> pd.DataFrame:
    """
    Build a single-row feature frame for prediction from the most recent
    known prices (most-recent-first list of at least 3 values).
    """
    lag1 = recent_prices[0]
    lag2 = recent_prices[1] if len(recent_prices) > 1 else lag1
    lag3 = recent_prices[2] if len(recent_prices) > 2 else lag2
    roll3 = sum(recent_prices[:3]) / min(3, len(recent_prices))
    return pd.DataFrame(
        [{
            "month": month,
            "month_index": month_index,
            "lag1": lag1,
            "lag2": lag2,
            "lag3": lag3,
            "roll3": roll3,
            "coffee_type": coffee_type,
            "price_type": price_type,
            "season": season,
        }]
    )
