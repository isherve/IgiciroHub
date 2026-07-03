"""
Train coffee price prediction models.

Design choices (documented for the report / defense):
  * We train TWO production models rather than one:
      - `model_farmgate.pkl` covers domestic RWF prices. Both `farmgate` and
        `cooperative` price types share this model, distinguished by a
        `price_type` categorical feature (they are strongly correlated and
        share the same RWF scale).
      - `model_export.pkl` covers the international export price in USD, which
        lives on a completely different scale, so it gets its own model.
  * The production estimator is a RandomForestRegressor. We ALSO train a
    LinearRegression baseline and a GradientBoostingRegressor and record a
    MAE/RMSE comparison so we can justify the Random Forest choice.
  * SPLIT: this is time-series data, so we use a CHRONOLOGICAL train/test
    split (last 20% of dates held out) plus a TimeSeriesSplit CV score —
    NOT a random shuffle, which would leak future info into training.
  * Prediction intervals come from the spread of the individual trees at
    inference time (see predictor.py), so we do not need a separate model.

Run:
    python -m predictions.ml.train_model            # standalone
    python manage.py train_model                    # via Django command
"""
from __future__ import annotations

import json

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from .config import (
    CATEGORICAL_FEATURES,
    COMPARISON_JSON,
    DOMESTIC_PRICE_TYPES,
    EXPORT_PRICE_TYPES,
    FEATURE_IMPORTANCE_JSON,
    MODEL_EXPORT,
    MODEL_FARMGATE,
    NUMERIC_FEATURES,
    TARGET,
)
from .dataset import ensure_dataset
from .features import add_features


def _build_pipeline(estimator) -> Pipeline:
    pre = ColumnTransformer(
        transformers=[
            ("num", "passthrough", NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )
    return Pipeline([("pre", pre), ("model", estimator)])


def _chronological_split(df: pd.DataFrame, test_frac: float = 0.2):
    """Hold out the most recent `test_frac` of rows by date (no shuffle)."""
    df = df.sort_values("date").reset_index(drop=True)
    cut = int(len(df) * (1 - test_frac))
    return df.iloc[:cut], df.iloc[cut:]


def _metrics(y_true, y_pred) -> dict:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mape = float(np.mean(np.abs((y_true - y_pred) / np.clip(np.abs(y_true), 1e-6, None))) * 100)
    return {
        "MAE": round(mae, 3),
        "RMSE": round(rmse, 3),
        "MAPE_pct": round(mape, 2),
        "accuracy_rate": round(max(0.0, 100 - mape), 2),
    }


def _train_group(name: str, df: pd.DataFrame, out_path) -> dict:
    """Train + compare models for one group; persist the Random Forest."""
    feat = add_features(df)
    X_cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    train, test = _chronological_split(feat)

    candidates = {
        "RandomForest": RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1),
        "LinearRegression": LinearRegression(),
        "GradientBoosting": GradientBoostingRegressor(random_state=42),
    }

    comparison = {}
    fitted = {}
    for model_name, est in candidates.items():
        pipe = _build_pipeline(est)
        pipe.fit(train[X_cols], train[TARGET])
        preds = pipe.predict(test[X_cols])
        comparison[model_name] = _metrics(test[TARGET].to_numpy(), preds)

        # Time-series cross-validation score (negative MAE) on the full set.
        tscv = TimeSeriesSplit(n_splits=4)
        cv = cross_val_score(
            _build_pipeline(est.__class__(**est.get_params())),
            feat[X_cols], feat[TARGET],
            cv=tscv, scoring="neg_mean_absolute_error",
        )
        comparison[model_name]["cv_MAE"] = round(float(-cv.mean()), 3)
        fitted[model_name] = pipe

    # Production model = Random Forest, refit on ALL data for best deployment perf.
    prod = _build_pipeline(
        RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
    )
    prod.fit(feat[X_cols], feat[TARGET])
    joblib.dump(prod, out_path)

    # Feature importance (from the production RF).
    rf = prod.named_steps["model"]
    ohe = prod.named_steps["pre"].named_transformers_["cat"]
    cat_names = list(ohe.get_feature_names_out(CATEGORICAL_FEATURES))
    feat_names = NUMERIC_FEATURES + cat_names
    importances = {
        n: round(float(v), 4) for n, v in zip(feat_names, rf.feature_importances_)
    }
    importances = dict(sorted(importances.items(), key=lambda kv: kv[1], reverse=True))

    return {
        "group": name,
        "n_rows": int(len(feat)),
        "model_path": out_path.name,
        "comparison": comparison,
        "feature_importance": importances,
        "chosen_model": "RandomForest",
        "accuracy_rate": comparison["RandomForest"]["accuracy_rate"],
    }


def _print_comparison(title: str, comparison: dict):
    print(f"\n=== {title} — model comparison (held-out test set) ===")
    header = f"{'Model':<18}{'MAE':>10}{'RMSE':>10}{'MAPE%':>10}{'cv_MAE':>10}{'accuracy%':>12}"
    print(header)
    print("-" * len(header))
    for model_name, m in comparison.items():
        print(
            f"{model_name:<18}{m['MAE']:>10}{m['RMSE']:>10}{m['MAPE_pct']:>10}"
            f"{m['cv_MAE']:>10}{m['accuracy_rate']:>12}"
        )


def train_all(force_dataset: bool = False) -> dict:
    df = ensure_dataset(force=force_dataset)

    domestic = df[df["price_type"].isin(DOMESTIC_PRICE_TYPES)]
    export = df[df["price_type"].isin(EXPORT_PRICE_TYPES)]

    farmgate_result = _train_group("farmgate", domestic, MODEL_FARMGATE)
    export_result = _train_group("export", export, MODEL_EXPORT)

    comparison_out = {
        "farmgate": farmgate_result["comparison"],
        "export": export_result["comparison"],
        "note": "Chronological (time-series) split; RandomForest chosen for production.",
    }
    COMPARISON_JSON.write_text(json.dumps(comparison_out, indent=2))

    importance_out = {
        "farmgate": farmgate_result["feature_importance"],
        "export": export_result["feature_importance"],
    }
    FEATURE_IMPORTANCE_JSON.write_text(json.dumps(importance_out, indent=2))

    _print_comparison("FARMGATE (domestic RWF)", farmgate_result["comparison"])
    _print_comparison("EXPORT (USD)", export_result["comparison"])
    print(f"\nSaved models -> {MODEL_FARMGATE.name}, {MODEL_EXPORT.name}")
    print(f"Saved comparison -> {COMPARISON_JSON.name}")
    print(f"Saved feature importance -> {FEATURE_IMPORTANCE_JSON.name}")

    return {
        "farmgate": farmgate_result,
        "export": export_result,
    }


if __name__ == "__main__":
    train_all(force_dataset=True)
