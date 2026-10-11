import { Schema, model, type InferSchemaType } from "mongoose";

export const MISC_CATEGORIES = [
  "COLLEGE_GRANT",
  "PRIZE_MONEY",
  "SCRAP_SALE",
  "MERCHANDISE",
  "DONATION",
  "OTHER",
] as const;
export type MiscCategory = (typeof MISC_CATEGORIES)[number];

export const MISC_PAYMENT_MODES = [
  "UPI",
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const;
export type MiscPaymentMode = (typeof MISC_PAYMENT_MODES)[number];

const incomeMiscSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: MISC_CATEGORIES, default: "OTHER" },
    amount: { type: Number, required: true, min: 0 },
    dateReceived: { type: Date, default: Date.now },
    receivedBy: { type: String, default: "", trim: true },
    paymentMode: { type: String, enum: MISC_PAYMENT_MODES, default: "UPI" },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export type IncomeMiscDoc = InferSchemaType<typeof incomeMiscSchema>;
export const IncomeMisc = model("IncomeMisc", incomeMiscSchema);
