# Asterix A-BAJA 2027 Bill & Expense Management System

An internal expense management system for the **Asterix A-BAJA 2027** engineering team to submit, review, approve, and generate financial reports for project bills. The system features AI-assisted multimodal OCR bill processing, Google Drive automated evidence hierarchy storage, and automated Subsystem/Monthly Excel report generation.

---

## Key Features

- **Multimodal AI OCR (Google Gemini)**: Automatically parses uploaded receipt photos or PDFs (`gemini-2.5-flash`), extracting vendor name, invoice date, line items, tax amount, total amount, and suggested subsystem classification.
- **Automated Google Drive Evidence Vault**: Organizes uploaded bill evidence into a clean Google Drive folder hierarchy (`Bill Evidence/Pending`, `Bill Evidence/Approved/<Subsystem>`, `Bill Evidence/Rejected Bills`) using a Google Cloud Service Account on a Shared Drive.
- **Automated Excel Report Engine (`exceljs`)**: Automatically updates and regenerates Subsystem and Monthly Excel workbooks upon bill approval, uploading formatted reports directly to Google Drive.
- **Role-Based Access Control (RBAC)**:
  - **Member**: Submit bill drafts, upload attachments, trigger AI extraction, review extracted details, and submit bills for approval. Scope restricted to viewing own bills.
  - **Treasurer**: Full visibility across all team bills, dedicated approval queue with Accept / Reject capabilities (with mandatory rejection reasons), and access to global reports and analytics.
- **Duplicate Bill Detection**: Deterministic similarity algorithm flags potential duplicate submissions based on vendor name, date, invoice number, and total amount.
- **Analytics & Dashboard**: Interactive visual dashboards built with Recharts to monitor budget utilization, subsystem spend distribution, and monthly financial trends.

---

## System Architecture

```
Member / Treasurer
        │
        ▼
React + Vite Frontend (Vercel)
        │  HTTPS / REST API
        ▼
Node.js + Express + TypeScript Backend (Render)
        │
   ┌────┴───────────────────────────┬───────────────────────────┐
   ▼                                ▼                           ▼
MongoDB Atlas                 Google Drive API            Google Gemini API
(Primary Data Store)         (Evidence & Reports)         (Multimodal OCR)
```

- **MongoDB** is the single source of truth for structured bill records, users, subsystems, and report metadata.
- **Google Drive** stores raw evidence attachments and generated Excel reports.
- **Gemini AI** performs initial document extraction; user and treasurer confirmations remain authoritative.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, Vitest, Mongoose |
| **Database** | MongoDB Atlas |
| **File Storage** | Google Drive API v3 (Service Account + Shared Drive) |
| **AI / OCR** | Google Gemini API (`@google/genai`, Structured JSON Schema) |
| **Authentication** | JWT (JSON Web Tokens) & bcrypt password hashing |
| **Hosting** | Vercel (Frontend SPA), Render (Backend Express API) |

---

## Project Structure

```
.
├── backend/                  # Express REST API & TypeScript backend
│   ├── src/
│   │   ├── config/           # Database & environment configurations
│   │   ├── controllers/      # Route controllers (Auth, Bills, Reports, Analytics, Subsystems)
│   │   ├── middleware/       # Auth JWT verification & role authorization
│   │   ├── models/           # Mongoose schemas (User, Bill, Subsystem, Report, Vendor)
│   │   ├── routes/           # Express router endpoints
│   │   ├── services/         # Core business logic (Gemini AI, Google Drive, Excel Reports, Bill workflow)
│   │   ├── utils/            # Async handlers, ApiError, currency formatters
│   │   └── validators/       # Input validation schemas
│   └── tests/                # Vitest integration test suite (31 tests)
├── frontend/                 # React 18 + Vite SPA frontend
│   ├── src/
│   │   ├── api/              # Axios HTTP client & service endpoints
│   │   ├── components/       # UI layout, status badges, summary cards, bill lists
│   │   ├── context/          # Auth Context provider
│   │   ├── pages/            # Dashboard, Bills, AddBill, BillDetails, Approval, Reports, Analytics, Login
│   │   └── styles/           # Tailwind CSS index definitions
├── docs/                     # System documentation & specs
│   ├── specs/                # Original Word specification documents
│   ├── ARCHITECTURE.md       # Technical architecture & schema design
│   ├── API.md                # API reference specification
│   ├── DEVELOPMENT.md        # Developer workflow & testing guide
│   └── DEPLOYMENT.md         # Render & Vercel deployment guide
├── render.yaml               # Render infrastructure-as-code deployment blueprint
├── .env.example              # Environment variables template
└── README.md                 # System documentation
```

---

## Documentation Index

Detailed specifications and guides are organized under the [`docs/`](docs) folder:

- 🏗️ **[System Architecture](docs/ARCHITECTURE.md)**: Deep dive into services, data schemas, Gemini OCR pipeline, and Google Drive evidence vault.
- 📡 **[API Specification](docs/API.md)**: REST API endpoints reference, request payloads, and response structures.
- 💻 **[Development Guide](docs/DEVELOPMENT.md)**: Local setup, database seeding, environment configuration, and Vitest test execution.
- 🚀 **[Deployment Guide](docs/DEPLOYMENT.md)**: End-to-end cloud deployment (MongoDB Atlas, Google Cloud/Drive, Gemini, Render, Vercel).
- 📄 **[Requirements Specs](docs/specs)**: Original requirement documents (`.docx`).

---

## Getting Started

### Prerequisites

- **Node.js**: v20+
- **MongoDB Atlas**: Cluster connection string
- **Google Cloud Platform**: Shared Drive ID, Service Account credentials, and root folder ID
- **Google AI Studio**: Gemini API key

### 1. Backend Setup

```bash
cd backend
npm install
cp ../.env.example .env     # Fill in environment variables
npm run seed                 # Seed default subsystems and admin/member accounts
npm run dev                  # Start backend dev server on http://localhost:4000
```

Run test suite:
```bash
npm test
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env         # VITE_API_URL=http://localhost:4000/api
npm run dev                  # Start Vite dev server on http://localhost:5173
```

---

## Environment Variables Configuration

See `.env.example` at the repository root for required values:

- `PORT` - API Port (default `4000`)
- `FRONTEND_URL` - Allowed CORS origin (e.g. `http://localhost:5173` or production Vercel URL)
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` & `JWT_EXPIRES_IN` - Authentication security configuration
- `GEMINI_API_KEY` & `GEMINI_MODEL` - Google AI key (`gemini-2.5-flash`)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_SHARED_DRIVE_ID`, `GOOGLE_DRIVE_ROOT_FOLDER_ID` - Google Drive API integration secrets
- `SEED_TREASURER_USERNAME`, `SEED_TREASURER_PASSWORD`, `SEED_MEMBER_USERNAME`, `SEED_MEMBER_PASSWORD` - Initial seed credentials

---

## Verification & Testing

- **GitHub Actions CI/CD**: Automated pipeline configured in `.github/workflows/ci.yml` running on every push and pull request.
  - **Backend Test Job**: Executes 31 Vitest integration tests across 7 test suites on Node.js 20.
  - **Frontend Build Job**: Performs strict TypeScript compilation (`tsc -b`) and Vite production bundling.
- **Local Testing**:
  - Backend: `npm test` inside `/backend`
  - Frontend: `npm run build` inside `/frontend`

---

## Deployment

- **Backend Deployment**: Deployed on **Render** via `render.yaml` blueprint with health checks at `/api/health`.
- **Frontend Deployment**: Deployed on **Vercel** with client-side SPA route rewrites configured in `vercel.json`.