# Deployment Guide

End-to-end guide for deploying the **Asterix A-BAJA 2027 Bill & Expense Management System** to production:

- **MongoDB Atlas** — structured source of truth
- **Google Cloud + Drive API** — evidence & report storage
- **Google Gemini API** — bill OCR / extraction
- **Render** — Express API (backend)
- **Vercel** — React SPA (frontend)

Follow the sections in order. The whole stack runs on free / no-cost tiers for a team-scale workload.

---

## 0. Prerequisites

- A GitHub account with this repository pushed to it.
- A Google account with access to the team's **Shared Drive** (recommended) or a regular Drive folder.
- Node.js v20+ locally (only needed for seeding and local testing).

---

## 1. MongoDB Atlas (database)

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a project.
2. **Build a Database** → choose the **M0 Free** shared cluster, pick a region close to your Render region.
3. **Database Access** → *Add New Database User* → create a user with a strong password and the **Read and write to any database** role. Note the username/password.
4. **Network Access** → *Add IP Address* → `0.0.0.0/0` (Render's egress IPs are dynamic on the free plan). Tighten later if you upgrade to a plan with static IPs.
5. **Connect** → *Drivers* → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/asterix?retryWrites=true&w=majority
   ```
   Add a database name (e.g. `asterix`) before the `?`. This is your **`MONGODB_URI`**.

Indexes are created automatically by Mongoose on boot — no manual index setup needed.

---

## 2. Google Cloud project + Drive API + Service Account (evidence storage)

The backend authenticates to Drive with a **service account** (no interactive OAuth, no refresh-token expiry — ideal for a server).

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a new project, e.g. `asterix-baja-2027`.
2. **APIs & Services → Library** → search **Google Drive API** → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → Service account**:
   - Name it e.g. `asterix-drive-bot`, click **Done**.
   - Open the created service account → **Keys → Add key → Create new key → JSON**. A `.json` file downloads.
4. From that JSON file you need two values:
   - `client_email` → **`GOOGLE_SERVICE_ACCOUNT_EMAIL`**
   - `private_key` → **`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`** (keep the `\n` escape sequences intact; the backend un-escapes them automatically).
5. **Create the root folder and grant access:**
   - In Google Drive, create (or choose) a folder named **`Asterix A-BAJA 2027`**. Using a **Shared Drive** is strongly recommended so files aren't owned by a personal account and service-account storage quotas don't apply.
   - **Share** that folder (or the whole Shared Drive) with the service account's `client_email`, giving it **Content manager / Editor** access.
   - Open the folder in the browser and copy its ID from the URL
     (`https://drive.google.com/drive/folders/<THIS_IS_THE_ID>`) → **`GOOGLE_DRIVE_ROOT_FOLDER_ID`**.
   - If using a Shared Drive, also copy the Shared Drive ID → **`GOOGLE_DRIVE_SHARED_DRIVE_ID`** (leave blank for a normal folder).

The app auto-creates its child hierarchy (`Bill Evidence/Pending`, `.../Approved/<Subsystem>`, `.../Rejected Bills`, `Subsystem Reports`, `Monthly Reports`) on first use.

---

## 3. Google Gemini API (bill extraction)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → **Create API key** (you can attach it to the same Cloud project).
2. Copy the key → **`GEMINI_API_KEY`**.
3. Model is configurable via **`GEMINI_MODEL`** (default `gemini-2.5-flash` — fast and cost-effective for OCR). Never expose this key to the frontend; it lives only in Render env vars.

---

## 4. Backend on Render

1. Push this repo to GitHub. In the [Render Dashboard](https://dashboard.render.com) → **New → Blueprint** → connect the repo. Render auto-detects [`render.yaml`](../render.yaml) and provisions the `asterix-baja-backend` web service (`rootDir: backend`, build `npm install && npm run build`, start `npm start`, health check `/api/health`).
2. In the service's **Environment** tab, fill the secrets marked `sync: false`:

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | from step 1 |
   | `JWT_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
   | `FRONTEND_URL` | your Vercel URL, e.g. `https://asterix-baja.vercel.app` (needed for CORS) |
   | `GEMINI_API_KEY` | from step 3 |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | from step 2 |
   | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | from step 2 (paste the full `-----BEGIN...` block) |
   | `GOOGLE_DRIVE_ROOT_FOLDER_ID` | from step 2 |
   | `GOOGLE_DRIVE_SHARED_DRIVE_ID` | from step 2 (or leave empty) |

   `NODE_ENV`, `PORT`, `GEMINI_MODEL`, `JWT_EXPIRES_IN`, `MAX_UPLOAD_MB` already have sensible defaults in `render.yaml`.
3. Deploy. When the service is live, confirm `https://<your-api>.onrender.com/api/health` returns `{"status":"ok"}`.
4. **Seed the initial accounts.** Set the seed vars first (see below), then run once via Render's **Shell** tab:
   ```bash
   npm run seed
   ```
   This upserts the treasurer + member accounts and the default subsystems. Set these **before** seeding (and change them from the defaults):
   `SEED_TREASURER_USERNAME`, `SEED_TREASURER_PASSWORD`, `SEED_MEMBER_USERNAME`, `SEED_MEMBER_PASSWORD`.

---

## 5. Frontend on Vercel

1. In [Vercel](https://vercel.com) → **Add New → Project** → import the repo.
2. Set **Root Directory** = `frontend/`.
3. Framework preset **Vite**, Build Command `npm run build`, Output Directory `dist` (auto-detected).
4. Add environment variable **`VITE_API_URL`** = your Render API URL **+ `/api`**, e.g. `https://asterix-baja-api.onrender.com/api`.
5. Deploy. SPA deep-link routing is handled by [`frontend/vercel.json`](../frontend/vercel.json).
6. **Close the loop:** copy the final Vercel production URL back into Render's `FRONTEND_URL` and redeploy the backend so CORS accepts it.

---

## 6. Post-deployment verification

Walk the acceptance checklist end-to-end:

- [ ] Treasurer and member can log in; invalid credentials are rejected.
- [ ] Member uploads a PDF/JPG/PNG bill → status goes `PROCESSING` → AI fields populate.
- [ ] Member can edit every field and submit → `PENDING_APPROVAL`.
- [ ] Treasurer sees it in **Pending Approval**, can Accept / Reject.
- [ ] Approved evidence lands under `Bill Evidence/Approved/<Subsystem>` in Drive; rejected under `Rejected Bills`.
- [ ] Subsystem + monthly Excel reports appear and download.
- [ ] Analytics cards and charts reflect approved totals.
- [ ] No secrets in the browser (check the built JS / network tab).

---

## 7. Recommendations for better usability

- **Cold starts (Render free tier):** the free web service sleeps after ~15 min idle, so the first request can take ~30–50 s. Options, cheapest first:
  - Upgrade the Render service to the **Starter** paid plan (always-on) — the simplest fix for a team that uses it daily.
  - Or keep it warm with an external cron pinging `/api/health` every ~10 min (e.g. [cron-job.org](https://cron-job.org) or GitHub Actions scheduled workflow). Note this only masks cold starts on a free instance; a paid instance is more reliable.
  - The frontend already shows contextual loading/processing states, so a slow first call degrades gracefully rather than looking broken.
- **Custom domain:** add one in Vercel (e.g. `bills.asterixbaja.com`) and, if you want a matching API host, a custom domain on Render — then update `VITE_API_URL` and `FRONTEND_URL` accordingly.
- **Mobile install (PWA-lite):** members can "Add to Home Screen" from the browser for one-tap access; the UI is mobile-first and supports in-browser camera capture (`capture="environment"`) for photographing bills on the spot.
- **Atlas backups:** enable Atlas's free daily snapshot / point-in-time options; MongoDB is the source of truth and reports are always regeneratable from it (`POST /api/reports/regenerate`).
- **Rotate credentials for production:** change all `SEED_*` passwords, use a freshly generated `JWT_SECRET`, and keep the service-account JSON out of git (it already is — everything flows through env vars).
- **Region alignment:** put the Render service and the Atlas cluster in the same/nearby region to minimize DB latency.

---

## 8. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Missing required environment variable` on boot | A required env var is unset in Render. |
| Login works but every API call is CORS-blocked | `FRONTEND_URL` on Render doesn't exactly match the Vercel origin. |
| Bills stay `PROCESSING` / AI never fills in | `GEMINI_API_KEY` invalid or quota exhausted — the bill still falls back to manual entry. |
| Evidence never appears in Drive (`drive.status = FAILED`) | Service account not shared on the folder, wrong `GOOGLE_DRIVE_ROOT_FOLDER_ID`, or Shared Drive ID missing. |
| `The user's Drive storage quota has been exceeded` | Service accounts have no personal storage — use a **Shared Drive** and set `GOOGLE_DRIVE_SHARED_DRIVE_ID`. |
| DB connection timeout | Atlas Network Access doesn't allow Render's IP — add `0.0.0.0/0`. |
