import { Schema, model, type InferSchemaType } from "mongoose";

export const TO_BUY_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type ToBuyPriority = (typeof TO_BUY_PRIORITIES)[number];

export const TO_BUY_STATUSES = [
  "PENDING",
  "APPROVED",
  "ORDERED",
  "PURCHASED",
  "CANCELLED",
] as const;
export type ToBuyStatus = (typeof TO_BUY_STATUSES)[number];

const toBuyItemSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true, index: true },
    subsystem: { type: Schema.Types.ObjectId, ref: "Subsystem", default: null, index: true },
    category: { type: String, default: "General", trim: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    unit: { type: String, default: "pcs", trim: true },
    estimatedCost: { type: Number, default: 0, min: 0 },
    priority: {
      type: String,
      enum: TO_BUY_PRIORITIES,
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: TO_BUY_STATUSES,
      default: "PENDING",
      index: true,
    },
    supplierUrl: { type: String, default: "", trim: true },
    suggestedVendor: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    sourceInventoryItem: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      default: null,
      index: true,
    },
    linkedBillId: { type: Schema.Types.ObjectId, ref: "Bill", default: null, index: true },
  },
  { timestamps: true }
);

export type ToBuyItemDoc = InferSchemaType<typeof toBuyItemSchema>;
export const ToBuyItem = model("ToBuyItem", toBuyItemSchema);
