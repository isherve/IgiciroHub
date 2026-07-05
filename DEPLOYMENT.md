# IgiciroHub — Deployment Guide (App Store + Play Store)

Publishing has **two stages**. Do them in order.

1. **Host the backend** so phones can reach the API over the internet (Render).
2. **Build & submit the mobile app** to the stores (Expo EAS).

---

## Stage 1 — Host the Django backend on Render (free)

Everything is already configured (`render.yaml`, `backend/build.sh`, PostgreSQL +
WhiteNoise support). You just need to connect the repo.

### Steps

1. Push this project to a **GitHub** repository (if it isn't already).
2. Create a free account at <https://render.com> and connect your GitHub.
3. Click **New +  →  Blueprint**, select this repo. Render reads `render.yaml`
   and creates:
   - a web service **igicirohub-api**
   - a PostgreSQL database **igicirohub-db**
4. Click **Apply**. The first deploy runs `build.sh`, which installs deps,
   migrates the database, trains the ML models, and seeds demo data.
5. When it finishes you get a public URL like
   `https://igicirohub-api.onrender.com`. Open it — it should return
   `{"status": "ok"}`. Swagger is at `/api/docs/`.

### Enable full Gemini AI assistant

1. Get a **free API key** from [Google AI Studio](https://aistudio.google.com/apikey).
2. Open the Render dashboard → **igicirohub-api** → **Environment**.
3. Add or update:
   - `GEMINI_API_KEY` = your key (starts with `AIza…`)
   - `GEMINI_MODEL` = `gemini-2.0-flash` (already set in `render.yaml`)
4. Click **Save Changes** — Render redeploys automatically (~3 min).
5. Log in to the app, open **AI Assistant**, and ask a question. Replies show `source: gemini` when live.

> Without `GEMINI_API_KEY`, the assistant still works using offline answers from your database (prices, listings).

### After the first deploy

- Fill in optional env vars in the **Environment** tab: `GEMINI_API_KEY`, `AT_API_KEY`, email settings.
- Update `CORS_ALLOWED_ORIGINS` if you host an Expo web build anywhere.

> **Note:** Render's free tier sleeps after inactivity, so the first request
> after idle takes ~30s. For production use, upgrade the web service and
> database to a paid plan.

---

## Stage 2 — Build & submit the mobile app (Expo EAS)

### One-time setup

1. Create a free **Expo** account at <https://expo.dev>.
2. Create the paid store developer accounts (required by Apple/Google):
   - **Apple Developer Program** — $99/year — <https://developer.apple.com>
   - **Google Play Console** — $25 once — <https://play.google.com/console>
3. Install the CLI and log in:
   ```bash
   npm install -g eas-cli
   eas login
   ```

### Point the app at your live backend

Edit `frontend/eas.json` and replace the placeholder URL in **both** the
`preview` and `production` profiles with your Render URL:

```json
"EXPO_PUBLIC_API_URL": "https://igicirohub-api.onrender.com"
```

### Test build first (recommended)

Build an installable Android APK and try it on a real phone:

```bash
cd frontend
eas build:configure          # links the project to your Expo account (first run only)
eas build --platform android --profile preview
```

Download the APK from the link EAS prints, install it, and confirm login /
prediction work against the live backend.

### Production builds

```bash
eas build --platform android --profile production   # -> .aab for Play Store
eas build --platform ios --profile production        # -> for App Store (needs Apple account)
```

### Submit to the stores

```bash
eas submit --platform android    # uploads to Google Play
eas submit --platform ios        # uploads to App Store Connect
```

Then finish the listing in each store's console (screenshots, description,
privacy policy, data-safety form) and press **Submit for review**.

---

## Store listing checklist (you must provide these)

- App name, short + full description
- App icon (already in `frontend/assets/images/icon.png`) and screenshots
- **Privacy policy URL** — required by both stores (the app handles accounts,
  location, and messages)
- **Data safety / App privacy** disclosure form
- Category: *Business* or *Finance*
- Content rating questionnaire

---

## Identifiers already configured

| Setting | Value | Where |
|---------|-------|-------|
| iOS bundle ID | `rw.igicirohub.app` | `frontend/app.json` |
| Android package | `rw.igicirohub.app` | `frontend/app.json` |
| Backend settings | `igicirohub.settings.prod` | `render.yaml` |

Change `rw.igicirohub.app` before your first build if you want a different
identifier (it cannot be changed after publishing).
