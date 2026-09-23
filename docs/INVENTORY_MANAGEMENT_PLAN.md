# Inventory Management System — Phase 2 Plan

## Overview

Extension of the Asterix A-BAJA 2027 Bill & Expense Management System to track physical inventory (parts, consumables, tools) purchased through approved bills. This plan outlines the domain model, API surface, RBAC extensions, migration strategy, and rollout milestones.

---

## 1. Domain Model

### InventoryItem Schema

| Field | Type | Description |
|-------|------|-------------|
| `itemId` | string | Auto-generated (e.g. `INV-001`) |
| `name` | string | Human-readable item name |
| `category` | enum | `PART`, `CONSUMABLE`, `TOOL`, `RAW_MATERIAL` |
| `subsystem` | ObjectId (ref Subsystem) | Owning subsystem |
| `quantity` | number | Current stock count |
| `unit` | string | e.g. "pcs", "kg", "m", "L" |
| `unitCost` | number | Last known unit cost |
| `totalValue` | number | Computed: quantity × unitCost |
| `location` | string | Physical location (e.g. "Workshop Bay 3") |
| `minStockLevel` | number | Reorder threshold |
| `linkedBills` | ObjectId[] (ref Bill) | Bills that supplied this item |
| `status` | enum | `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `RESERVED` |
| `addedBy` | ObjectId (ref User) | Who created the record |
| `lastUpdated` | Date | Last modification timestamp |
| `notes` | string | Free-form notes |

### InventoryTransaction Schema

| Field | Type | Description |
|-------|------|-------------|
| `transactionId` | string | Auto-generated |
| `item` | ObjectId (ref InventoryItem) | Target item |
| `type` | enum | `INBOUND` (purchase), `OUTBOUND` (usage), `ADJUSTMENT`, `RETURN` |
| `quantity` | number | Positive for in, negative for out |
| `bill` | ObjectId (ref Bill, nullable) | Only for INBOUND from a purchase |
| `reason` | string | Why this transaction occurred |
| `performedBy` | ObjectId (ref User) | Who logged it |
| `timestamp` | Date | When it happened |

---

## 2. RBAC Extensions

| Role | Permissions |
|------|------------|
| **MEMBER** | View inventory for own subsystem, log usage (OUTBOUND), request items |
| **TREASURER** | Full CRUD on all inventory, approve cross-subsystem transfers, view reports |
| **ADMIN** | All Treasurer permissions + manage categories, bulk import/export |

---

## 3. API Surface

### Inventory Items

- `GET /api/inventory` — list items (filterable by subsystem, category, status)
- `GET /api/inventory/:id` — item details with transaction history
- `POST /api/inventory` — create item (Treasurer/Admin)
- `PATCH /api/inventory/:id` — update item metadata (Treasurer/Admin)
- `DELETE /api/inventory/:id` — soft-delete (Admin only)

### Inventory Transactions

- `POST /api/inventory/:id/transactions` — log a transaction (usage, adjustment)
- `GET /api/inventory/:id/transactions` — transaction history for an item

### Auto-linking

- `POST /api/inventory/link-bill/:billId` — create inventory items from an approved bill's line items

### Reports

- `GET /api/inventory/reports/stock-summary` — current stock levels by subsystem
- `GET /api/inventory/reports/usage` — usage trends over time
- `GET /api/inventory/reports/low-stock` — items below reorder threshold

---

## 4. Migration Strategy

1. **Non-breaking addition**: new collections (`inventoryItems`, `inventoryTransactions`) — no changes to existing Bill or Subsystem schemas.
2. **Mongoose indexes**: compound index on `(subsystem, status)`, unique on `itemId`, index on `linkedBills`.
3. **Seed script extension**: add sample inventory items for development/testing.
4. **Backward compatibility**: existing bill workflow unchanged; inventory linking is opt-in after bill approval.

---

## 5. Frontend Views

- **Inventory Dashboard**: stock levels by subsystem, low-stock alerts, recent transactions.
- **Item Detail Page**: full item info, transaction log, linked bills.
- **Add/Edit Item Form**: manual item creation with subsystem assignment.
- **Usage Logger**: quick-entry form for members to log part usage from the workshop.
- **Bill → Inventory Wizard**: after bill approval, treasurer can map line items to inventory.

---

## 6. Testing Strategy

- **Unit tests**: Vitest suites for inventory CRUD, transaction logging, stock calculations.
- **Integration tests**: bill-to-inventory linking flow, RBAC enforcement, low-stock alerts.
- **E2E smoke**: member logs usage → stock decrements → low-stock alert fires.
- **CI**: extend existing GitHub Actions workflow with inventory test suites.

---

## 7. Rollout Milestones

| Milestone | Scope | Target |
|-----------|-------|--------|
| **M1** — Schema & API | Domain models, CRUD endpoints, basic tests | Week 1–2 |
| **M2** — Bill Linking | Auto-create inventory from approved bills | Week 3 |
| **M3** — Frontend Views | Dashboard, item detail, usage logger | Week 4–5 |
| **M4** — Reports & Alerts | Stock reports, low-stock notifications | Week 6 |
| **M5** — Polish & Deploy | E2E testing, documentation, production deploy | Week 7 |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Stale stock data from manual tracking | Medium | Transaction log provides audit trail; periodic physical counts reconcile |
| Scope creep into procurement/PO system | High | Strict Phase-2 boundary — no purchase orders, no supplier management |
| MongoDB schema bloat | Low | Separate collections, no embedding in Bill documents |
| RBAC complexity | Medium | Reuse existing role middleware; inventory permissions map cleanly to MEMBER/TREASURER/ADMIN |
| Data migration from spreadsheets | Medium | Provide CSV bulk-import endpoint for initial data load |
