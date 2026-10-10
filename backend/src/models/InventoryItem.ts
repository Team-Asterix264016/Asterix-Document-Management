import { Schema, model, type InferSchemaType } from "mongoose";

export const INVENTORY_STATUSES = [
  "AVAILABLE",
  "CHECKED_OUT",
  "INSTALLED",
  "MISSING",
  "DAMAGED",
] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const CUSTODY_ACTIONS = [
  "CREATED",
  "CHECKOUT",
  "CHECKIN",
  "TRANSFER",
  "RELOCATED",
  "MARKED_MISSING",
  "MARKED_FOUND",
  "UPDATED",
] as const;
export type CustodyAction = (typeof CUSTODY_ACTIONS)[number];

const historyEntrySchema = new Schema(
  {
    action: { type: String, enum: CUSTODY_ACTIONS, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, default: Date.now },
    location: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: true }
);

const missingDetailsSchema = new Schema(
  {
    isMissing: { type: Boolean, default: false },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reportedAt: { type: Date, default: null },
    lastKnownLocation: { type: String, default: "" },
    lastKnownHolder: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const inventoryItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    partNumber: { type: String, default: "", trim: true, index: true },
    subsystem: { type: Schema.Types.ObjectId, ref: "Subsystem", default: null, index: true },
    category: { type: String, default: "General", trim: true, index: true },
    description: { type: String, default: "" },
    quantity: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: "pcs", trim: true },
    location: { type: String, required: true, default: "Main Workshop", trim: true, index: true },
    status: {
      type: String,
      enum: INVENTORY_STATUSES,
      default: "AVAILABLE",
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedAt: { type: Date, default: null },
    expectedReturnDate: { type: Date, default: null },
    missingDetails: { type: missingDetailsSchema, default: () => ({ isMissing: false }) },
    history: { type: [historyEntrySchema], default: [] },
    createdByUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Text search on name, partNumber, description, and location
inventoryItemSchema.index({
  name: "text",
  partNumber: "text",
  location: "text",
  description: "text",
});

export type InventoryItemDoc = InferSchemaType<typeof inventoryItemSchema>;
export const InventoryItem = model("InventoryItem", inventoryItemSchema);
