#!/usr/bin/env bash
# Render build script. Runs on every deploy.
set -o errexit

pip install -r requirements.txt

# Collect static files (admin, Swagger UI assets) for WhiteNoise.
python manage.py collectstatic --no-input

# Apply database migrations.
python manage.py migrate

# Train the ML models if the pickles are missing (first deploy).
if [ ! -f predictions/ml/model_farmgate.pkl ]; then
  python manage.py train_model --regenerate-data
fi

# Seed demo data (idempotent — safe to run repeatedly).
python manage.py seed_demo_data
