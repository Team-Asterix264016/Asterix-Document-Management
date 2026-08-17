# Developer Guide & Local Workflow

## Environment Setup

### Prerequisites
- Node.js 20+
- npm 10+
- MongoDB Atlas cluster URI
- Google Cloud Platform Service Account JSON credentials
- Gemini API Key

---

## Installation & Running Locally

1. **Clone the Repository**:
   ```bash
   git clone <repo-url>
   cd "Asterix Document management"
   ```

2. **Backend Config**:
   ```bash
   cd backend
   npm install
   cp ../.env.example .env
   ```
   Fill in `.env` variables (`MONGODB_URI`, `GEMINI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, etc.).

3. **Database Seeding**:
   ```bash
   npm run seed
   ```
   Seeds default subsystems and initial member/treasurer test accounts.

4. **Start Backend Dev Server**:
   ```bash
   npm run dev
   # Server starts at http://localhost:4000
   ```

5. **Frontend Config & Start**:
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   npm run dev
   # Vite starts at http://localhost:5173
   ```

---

## Testing

Run backend Vitest integration suite:
```bash
cd backend
npm test
```

Build & typecheck frontend:
```bash
cd frontend
npm run build
```
