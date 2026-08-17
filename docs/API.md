# API Reference Specification

All endpoints are prefixed with `/api`. Requests expecting authentication require a `Bearer <token>` header in `Authorization`.

---

## Auth Endpoints

### `POST /api/auth/login`
Authenticates a team member or treasurer.
- **Request Body**:
  ```json
  {
    "username": "member1",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "token": "eyJhbGci...",
    "user": {
      "id": "60d...",
      "username": "member1",
      "name": "Alex Member",
      "role": "MEMBER"
    }
  }
  ```

### `GET /api/auth/me`
Returns current authenticated user details.

---

## Bill Management Endpoints

### `GET /api/bills`
Lists bills.
- **Query Parameters**: `status`, `subsystem`, `search`, `startDate`, `endDate`, `page`, `limit`
- **Role Scoping**: Members view their own submitted bills; Treasurers view all team bills.

### `POST /api/bills`
Creates a draft bill record.

### `GET /api/bills/:id`
Gets full details for a specific bill.

### `PUT /api/bills/:id`
Updates draft bill fields (amount, vendor, subsystem, line items).

### `POST /api/bills/:id/attachments`
Uploads a receipt image or PDF attachment for AI processing and Drive storage.

### `POST /api/bills/:id/submit`
Submits a bill draft for Treasurer approval. Performs duplicate checks.

### `POST /api/bills/:id/accept` (Treasurer Only)
Approves a pending bill. Triggers Drive file relocation and Excel report generation.

### `POST /api/bills/:id/reject` (Treasurer Only)
Rejects a pending bill with a mandatory reason. Relocates evidence to `Bill Evidence/Rejected Bills`.

---

## Report Endpoints

### `GET /api/reports`
Lists generated subsystem and monthly Excel reports available on Drive.

### `POST /api/reports/regenerate` (Treasurer Only)
Forces complete regeneration of all Subsystem and Monthly Excel workbooks from MongoDB records.

---

## Analytics Endpoints

### `GET /api/analytics`
Returns total spend metrics, subsystem budget allocations, status breakdown, and monthly spending trends.

---

## Subsystem Endpoints

### `GET /api/subsystems`
Returns list of registered team subsystems (e.g. Powertrain, Chassis, Electrical, Brakes).
