# Technical Architecture & System Design

The **Asterix A-BAJA 2027 Bill & Expense Management System** is a dedicated internal financial portal designed to streamline expense submission, AI verification, Drive evidence storage, treasurer approval, and automated Excel reporting.

---

## 1. High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite SPA                     │
│                  (Vercel Deployment)                   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST API
┌───────────────────────────▼────────────────────────────┐
│              Express.js + TypeScript API               │
│                  (Render Deployment)                   │
└───────┬───────────────────┼────────────────────┬───────┘
        │                   │                    │
┌───────▼────────┐  ┌───────▼─────────┐  ┌───────▼────────┐
│  MongoDB Atlas │  │  Google Drive   │  │ Google Gemini  │
│  (Data Store)  │  │ (Evidence Vault)│  │ (Multimodal AI)│
└────────────────┘  └─────────────────┘  └────────────────┘
```

---

## 2. Core Subsystems & Services

### A. Multimodal AI Processing (`geminiService.ts`)
- Utilizes Google Gemini (`gemini-2.5-flash`) with structured JSON schema responses (`responseSchema`).
- Processes uploaded receipt photos (JPEG, PNG, WEBP) or PDFs.
- Extracts vendor name, bill date, line items, tax amount, total amount, and predicts the matching team subsystem.

### B. Google Drive Evidence Vault (`driveService.ts`)
- Authenticates via a Google Cloud Service Account against a Shared Drive.
- Dynamically maintains folder structures:
  - `Bill Evidence/Pending`
  - `Bill Evidence/Approved/<Subsystem>`
  - `Bill Evidence/Rejected Bills`
  - `Subsystem Reports/<Subsystem>`
  - `Monthly Reports/<Month>`

### C. Excel Report Engine (`reportService.ts`)
- Powered by `exceljs`.
- Automatically generates/updates `.xlsx` workbooks upon bill approval for:
  1. Subsystem Expense Reports
  2. Monthly Team Expense Summary Reports
- Uploads formatted workbooks directly to Google Drive.

### D. Duplicate Detection (`duplicateService.ts`)
- Evaluates submitted bills against existing database records.
- Flags potential duplicates matching vendor, total amount, invoice number, and date proximity.

---

## 3. Data Schema Definitions

### User Schema (`User.ts`)
- `username`: string (unique)
- `passwordHash`: string (bcrypt)
- `name`: string
- `role`: `MEMBER` | `TREASURER`

### Bill Schema (`Bill.ts`)
- `billNumber`: string (unique generated ID)
- `vendorName`: string
- `subsystem`: ObjectId (ref `Subsystem`)
- `amount`: number
- `taxAmount`: number
- `date`: Date
- `status`: `DRAFT` | `PROCESSING` | `PENDING_APPROVAL` | `APPROVED` | `REJECTED`
- `evidenceUrl`: string
- `driveFileId`: string
- `items`: Array<{ description: string, quantity: number, unitPrice: number, amount: number }>
- `createdBy`: ObjectId (ref `User`)
- `rejectionReason`: string
- `aiExtraction`: Object (raw AI results & confidence)

### Subsystem Schema (`Subsystem.ts`)
- `name`: string
- `code`: string (e.g. `POW`, `CHA`, `ELE`, `BRA`)
- `description`: string

---

## 4. Security & Compliance
- **Authentication**: JWT signed token stored client-side in localStorage and sent in Authorization Header (`Bearer <token>`).
- **Authorization**: Middleware enforcing role-level guards (`MEMBER` vs `TREASURER`).
- **CORS Lock**: Restricted strictly to configured `FRONTEND_URL`.
