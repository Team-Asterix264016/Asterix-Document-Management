# CI/CD and Deployment Audit

Audit date: 2026-09-23. Scope: GitHub Actions, Render (backend), frontend hosting, MongoDB Atlas, dependencies.

## Summary

| Area | Status before | Status after this PR |
|---|---|---|
| CI workflow | Ran tests and frontend build only, on Node 20 | Typecheck, tests, build, lint and dependency audit on Node 22.20.0 (matches production) |
| Frontend lint | `npm run lint` failed: ESLint not installed, no config | ESLint 9 flat config, 0 errors |
| Dependency updates | Manual | Dependabot weekly (npm) and monthly (Actions) |
| Production vulnerabilities | 10 moderate | 4 moderate left, all need major upgrades (see below) |
| Render backend | Live, but MongoDB blocked by the Atlas IP allowlist | Live and connected (Atlas allowlist fixed outside the repo) |
| AI assistant | Silently returned "Found 0 entries" on any Gemini error | Reports the failure reason to the user, and the fallback gives real totals |
| Frontend hosting | Not found on Render or on the connected Vercel account | **Action needed**, see below |

## Findings and fixes

### 1. CI ran on a different Node version than production (fixed)
CI used Node 20. `backend/.node-version` and `render.yaml` use 22.20.0. The pipeline now pins
`NODE_VERSION: 22.20.0` in one place, and `frontend/.node-version` was added so any host picks up the same version.

### 2. CI never typechecked or built the backend (fixed)
Render runs `npm run build` (`tsc`). A type error would pass CI and then fail the Render deploy.
The backend job now runs `typecheck`, `test`, then `build`, the same command Render runs.

### 3. Frontend `lint` script was broken (fixed)
`eslint` was referenced but not installed and had no config. Added ESLint 9 with `typescript-eslint`,
`react-hooks` and `react-refresh`, and fixed the 6 errors it found (untyped `any`s and unused imports).

### 4. No workflow hardening (fixed)
Added `permissions: contents: read`, `concurrency` (cancels superseded runs), per-job `timeout-minutes`,
a `workflow_dispatch` trigger, a cache for the MongoDB test binary, and a build artifact upload.
Removed triggers for `master`/`develop`, which do not exist.

### 5. No dependency scanning (fixed)
Added an `audit` job (`npm audit --omit=dev --audit-level=high`, fails only on high or critical advisories)
and `.github/dependabot.yml`.

Semver-compatible fixes were applied (express, body-parser, qs, gaxios, react-router). Remaining moderate advisories
need breaking upgrades and should be handled in their own PRs:
- `googleapis` (and `googleapis-common`): major upgrade to v181.
- `exceljs` (via `uuid`): npm suggests a downgrade to 3.4.0, which is not acceptable. Wait for an upstream fix.

### 6. Render service config has drifted from `render.yaml` (action needed)
- The live service builds with `npm install --include=dev && npm run build`; `render.yaml` says `npm ci --include=dev ...`.
  `npm ci` is stricter and reproducible. Update the build command in Render → Settings, or sync the Blueprint.
- The `asterix-baja-frontend` static site in `render.yaml` was never created.

### 7. Frontend hosting and CORS (action needed)
The frontend was not found on Render or on the connected Vercel account. Wherever it is hosted:
1. Set `VITE_API_URL=https://asterix-baja-backend.onrender.com/api` on the frontend host and redeploy.
2. Set `FRONTEND_URL=<frontend URL>` on the Render backend. It is a comma-separated CORS allowlist; without it,
   browser logins from the deployed site are blocked.

### 8. Gemini API key on Render is invalid (action needed)
Render logs show `API_KEY_INVALID` from Google. The AI assistant and bill OCR both depend on it.
Create a new key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY` in Render → Environment.
Until then, the assistant shows a clear notice and falls back to keyword search.

### 9. MongoDB Atlas network access (fixed outside the repo)
Render's free plan has no static outbound IP, so the Atlas allowlist blocked it
(`tlsv1 alert internal error`, `SSL alert number 80`). `0.0.0.0/0` was added to the Atlas project.
The cluster still requires a username and password. Keep the database user passwords strong and rotate any that were shared.

### 10. Flaky backend test run (monitor)
One local run reported a single worker error; the next full run passed 14/14 files. The suite already runs files
sequentially with a 30s timeout. If it recurs in CI, capture the failing file from the Actions log.

## Pipeline overview

```
push / PR to main
 ├─ backend:  npm ci → typecheck → vitest (in-memory MongoDB) → tsc build
 ├─ frontend: npm ci → eslint → tsc -b + vite build → upload dist artifact
 └─ audit:    npm audit (backend, frontend), fails on high/critical only

merge to main
 └─ Render auto-deploys backend (health check: GET /api/health)
```

## Recommended next steps
1. Fix `GEMINI_API_KEY` on Render.
2. Deploy the frontend and set `FRONTEND_URL` / `VITE_API_URL`.
3. Protect `main` on GitHub: require the `Backend`, `Frontend` and `Dependency audit` checks and one review.
4. In Render, set "Auto-Deploy" to "After CI checks pass" so a red build never ships.
