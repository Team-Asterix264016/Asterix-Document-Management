# Deployment Guide (Render + Vercel)

This repository is configured for automated cloud deployment with **Render** hosting the Express API and **Vercel** hosting the React SPA.

---

## 1. Backend Deployment (Render)

1. Connect the GitHub repository in the **Render Dashboard**.
2. Render automatically detects `render.yaml` at the root.
3. Configure the following secret environment variables in the Render Dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `GOOGLE_DRIVE_SHARED_DRIVE_ID`
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID`
   - `FRONTEND_URL` (Set to your Vercel production app URL, e.g. `https://asterix-baja.vercel.app`)

Health check endpoint is available at `/api/health`.

---

## 2. Frontend Deployment (Vercel)

1. Import the repository into **Vercel**.
2. Set the **Root Directory** to `frontend/`.
3. Set the build settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Set Environment Variable:
   - `VITE_API_URL`: Your deployed Render API URL + `/api` (e.g. `https://asterix-baja-api.onrender.com/api`)

SPA routing rewrites are pre-configured in `frontend/vercel.json`.
