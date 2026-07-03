"""
Synthetic Rwandan coffee price dataset generator.

IMPORTANT: This is a *placeholder* dataset used so the full ML + prediction
pipeline works end-to-end before real data is sourced. Replace
`coffee_prices.csv` with real NAEB / ICO historical data when available
(same columns: date, coffee_type, price_type, price, season).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .config import COFFEE_TYPES, DATA_CSV


def _season_for_month(month: int) -> str:
    if 3 <= month <= 7:
        return "main_harvest"
    if 9 <= month <= 12:
        return "fly_crop"
    return "off_season"


# Baseline monthly price levels (RWF/kg for domestic, USD/kg for export).
_BASE_RWF = {
    "red_bourbon": 1850,
    "arabica": 1700,
    "bourbon_mayaguez": 1780,
    "jackson": 1600,
    "robusta": 1200,
}
_BASE_USD = {
    "red_bourbon": 6.2,
    "arabica": 5.8,
    "bourbon_mayaguez": 6.0,
    "jackson": 5.2,
    "robusta": 3.4,
}

# Multiplier for cooperative price vs farmgate (coops pay a bit more).
_COOP_UPLIFT = 1.08


def generate_synthetic_dataset(
    start: str = "2019-01-01",
    months: int = 72,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate monthly prices with trend + seasonality + noise."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range(start=start, periods=months, freq="MS")
    rows = []

    for ct in COFFEE_TYPES:
        base_rwf = _BASE_RWF[ct]
        base_usd = _BASE_USD[ct]
        for i, d in enumerate(dates):
            month = d.month
            season = _season_for_month(month)
            # Gentle upward trend over time.
            trend = 1 + 0.0045 * i
            # Seasonality: prices dip during main harvest (supply high), rise off-season.
            seasonal = {
                "main_harvest": 0.94,
                "fly_crop": 1.02,
                "off_season": 1.06,
            }[season]

            noise = rng.normal(1.0, 0.03)
            # Domestic RWF price (farmgate)
            farmgate = base_rwf * trend * seasonal * noise
            cooperative = farmgate * _COOP_UPLIFT * rng.normal(1.0, 0.01)
            # Export USD price (correlated but with its own noise)
            export = base_usd * trend * (0.97 + 0.06 * (seasonal - 0.94)) * rng.normal(1.0, 0.035)

            rows.append((d.date(), ct, "farmgate", round(farmgate, 2), season))
            rows.append((d.date(), ct, "cooperative", round(cooperative, 2), season))
            rows.append((d.date(), ct, "export", round(export, 2), season))

    df = pd.DataFrame(rows, columns=["date", "coffee_type", "price_type", "price", "season"])
    return df


def ensure_dataset(force: bool = False) -> pd.DataFrame:
    """Load the CSV if present, otherwise generate and persist the synthetic one."""
    if DATA_CSV.exists() and not force:
        return pd.read_csv(DATA_CSV, parse_dates=["date"])
    df = generate_synthetic_dataset()
    df.to_csv(DATA_CSV, index=False)
    return pd.read_csv(DATA_CSV, parse_dates=["date"])


if __name__ == "__main__":
    d = ensure_dataset(force=True)
    print(f"Wrote {len(d)} rows to {DATA_CSV}")
    print(d.head())
