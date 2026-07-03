# IgiciroHub

**An AI-based mobile application for coffee price prediction and cooperative market access** — University of Rwanda capstone project.

IgiciroHub helps Rwandan coffee cooperatives and buyers see current and **predicted** coffee prices (farm-gate, cooperative, and export/USD), reach each other through a marketplace and chat, set price alerts (in-app / email / SMS), and generate PDF forecast reports. Predictions come from a Random Forest model trained on historical price data, and are returned as a **range with a confidence interval**, not a single number.

```
IgiciroHub/
├── backend/     # Django + DRF API, SQLite, ML models
├── frontend/    # Expo (React Native) + TypeScript app
└── README.md
```

---

## Features

- **Auth** — register as Cooperative or Buyer, JWT login/refresh/blacklist, password reset, brute-force lockout, rate limiting.
- **Prices** — historical RWF/USD prices, trending endpoint, seasonal aggregation, charts.
- **Predictions (flagship)** — `RandomForestRegressor` per domestic/export scale; prediction **intervals** from tree spread; `%` change; accuracy rate; natural-language recommendation; feature-importance endpoint.
- **Marketplace** — cooperatives list coffee; buyers browse/filter and message sellers.
- **Chat** — buyer ↔ cooperative threads, unread counts, XSS-sanitized messages (polling for MVP).
- **Alerts + Notifications** — price-alert subscriptions checked by a management command; in-app + email/SMS (Africa's Talking) delivery.
- **Reports** — downloadable PDF prediction report with an embedded trend chart (ReportLab + Matplotlib).
- **AI Assistant (optional)** — Google Gemini chat + photo-based crop-disease description (graceful stub without an API key).
- **i18n** — English, Kinyarwanda, French (switchable in-app).
- **Offline** — Dashboard and Prediction screens cache their last payload and show an "Offline" banner.
- **Docs** — Swagger/OpenAPI at `/api/docs/`.

---

## Prerequisites

- Python 3.11+ (developed on 3.13)
- Node.js 18+ and npm (developed on Node 22)
- Expo Go app on a phone, or an Android/iOS emulator (optional; web works too)

---

## 1. Backend setup (`backend/`)

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt

# Environment
cp .env.example .env          # (Windows: copy .env.example .env)
# edit .env and set SECRET_KEY etc.

# Database
python manage.py migrate

# Train the ML models (generates the synthetic dataset the first time,
# trains Random Forest + Linear Regression + Gradient Boosting baselines,
# prints a comparison table, and writes model_farmgate.pkl / model_export.pkl)
python manage.py train_model --regenerate-data

# Seed demo data (demo cooperative + buyer accounts, ~24 months of prices,
# marketplace listings) — required for the "Demo Login" button
python manage.py seed_demo_data

# (optional) create an admin user for /admin/
python manage.py createsuperuser

# Run the server
python manage.py runserver 0.0.0.0:8000
```

Key URLs:

- API root / health: `http://127.0.0.1:8000/`
- Swagger docs: `http://127.0.0.1:8000/api/docs/`
- Django admin: `http://127.0.0.1:8000/admin/`

**Demo logins** (created by `seed_demo_data`):

| Role        | Email                  | Password   |
|-------------|------------------------|------------|
| Cooperative | `demo@igicirohub.rw`   | `Demo1234!`|
| Buyer       | `buyer@igicirohub.rw`  | `Demo1234!`|

### Price alerts (scheduled check)

Alerts are evaluated by a management command. For the MVP, run it on a schedule
(cron / Windows Task Scheduler); swap for Celery beat in production:

```bash
python manage.py check_alerts
```

### Optional integrations (in `.env`)

- `GEMINI_API_KEY` — enables the real AI assistant + disease detection.
- `AT_API_KEY` (+ `AT_USERNAME`, `AT_SENDER_ID`) — enables SMS alerts via Africa's Talking.
- `EMAIL_HOST` + creds — enables real SMTP email (otherwise emails print to the console in dev).

---

## 2. Frontend setup (`frontend/`)

```bash
cd frontend
npm install

# If testing on a physical device, point the app at your machine's LAN IP:
# create .env with:  EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000
# (Android emulator uses 10.0.2.2 automatically; iOS sim/web use 127.0.0.1)

npx expo start
```

Then press `a` (Android), `i` (iOS), `w` (web), or scan the QR code with Expo Go.

> The backend must be running. On Android emulator the default
> `http://10.0.2.2:8000` reaches the host's Django server. On a real device you
> **must** set `EXPO_PUBLIC_API_URL` to your computer's LAN IP.

---

## 3. Machine learning

Everything lives in `backend/predictions/ml/`:

| File | Purpose |
|------|---------|
| `dataset.py` | Generates a **synthetic** Rwandan coffee price dataset (trend + seasonality + noise). Replace `coffee_prices.csv` with real NAEB/ICO data when available. |
| `features.py` | Time-series feature engineering (calendar, lags t-1..t-3, rolling mean) computed per series to avoid leakage. |
| `train_model.py` | Trains RF + Linear Regression + Gradient Boosting; **chronological (time-series) split** + `TimeSeriesSplit` CV; saves `model_farmgate.pkl`, `model_export.pkl`, `model_comparison.json`, `feature_importance.json`. |
| `predictor.py` | Runtime prediction with a **10th–90th percentile interval** from the RF's individual trees. |

Retrain any time with:

```bash
python manage.py train_model              # reuse existing dataset
python manage.py train_model --regenerate-data   # regenerate synthetic data first
```

**Model choice:** two models are trained — one for domestic RWF prices
(`farmgate` + `cooperative`, distinguished by a categorical feature) and one for
the export USD price (different scale). Random Forest is used in production; the
comparison table (`model_comparison.json`) documents why over the baselines.

---

## 4. API testing (Postman)

Import `backend/IgiciroHub.postman_collection.json` into Postman. It includes
login (which saves the JWT to a collection variable), trending prices, predict,
feature importance, alerts, and the PDF report. Set the `base_url` variable
(defaults to `http://127.0.0.1:8000`).

---

## 5. Key API endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register/` | public |
| POST | `/api/auth/login/` | public, returns JWT + user |
| POST | `/api/auth/refresh/` | rotate access token |
| GET/PATCH | `/api/auth/me/` | current profile |
| GET | `/api/prices/trending/` | dashboard trending |
| GET | `/api/prices/history/` | chart series |
| POST | `/api/predictions/predict/` | **prediction with range + recommendation** |
| GET | `/api/predictions/feature-importance/` | what drives price |
| GET | `/api/crops/` | marketplace (public browse) |
| POST | `/api/chat/conversations/` | start a thread |
| GET/POST | `/api/alerts/subscriptions/` | price alerts |
| GET | `/api/alerts/notifications/` | in-app notifications |
| GET | `/api/reports/prediction/<id>/` | PDF download |
| POST | `/api/assistant/chat/` | Gemini assistant |

All endpoints require a `Bearer` JWT except register/login/refresh and the
public read endpoints (guest marketplace/price browse).

---

## Tech stack

**Backend:** Django 5, Django REST Framework, SimpleJWT, SQLite, scikit-learn,
pandas/numpy, ReportLab, Matplotlib, drf-spectacular, django-ratelimit.

**Frontend:** Expo (SDK 57) + React Native, TypeScript, Expo Router, Axios (JWT
interceptors), AsyncStorage, react-i18next, react-native-svg, NetInfo.
