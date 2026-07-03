"""Paths and shared config for the ML pipeline."""
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent
DATA_CSV = ML_DIR / "coffee_prices.csv"

# We train two production models:
#   - model_farmgate.pkl : domestic RWF prices (farmgate + cooperative price
#     types distinguished by a `price_type` categorical feature)
#   - model_export.pkl   : international export price in USD
MODEL_FARMGATE = ML_DIR / "model_farmgate.pkl"
MODEL_EXPORT = ML_DIR / "model_export.pkl"
COMPARISON_JSON = ML_DIR / "model_comparison.json"
FEATURE_IMPORTANCE_JSON = ML_DIR / "feature_importance.json"

# Coffee varieties used in the synthetic dataset (match prices.constants).
COFFEE_TYPES = ["red_bourbon", "arabica", "bourbon_mayaguez", "jackson", "robusta"]

# price_type -> which model file / currency it belongs to.
DOMESTIC_PRICE_TYPES = ["farmgate", "cooperative"]
EXPORT_PRICE_TYPES = ["export"]

NUMERIC_FEATURES = ["month", "month_index", "lag1", "lag2", "lag3", "roll3"]
CATEGORICAL_FEATURES = ["coffee_type", "price_type", "season"]
TARGET = "price"
