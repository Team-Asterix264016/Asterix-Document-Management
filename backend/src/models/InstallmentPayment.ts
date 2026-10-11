import { Schema, model, type InferSchemaType } from "mongoose";

export const PAYMENT_STATUSES = ["PAID", "PENDING", "PARTIAL"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_MODES = ["UPI", "CASH", "BANK_TRANSFER", "OTHER"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

const installmentPaymentSchema = new Schema(
  {
    installment: { type: Schema.Types.ObjectId, ref: "InstallmentPlan", required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountPaid: { type: Number, required: true, default: 0, min: 0 },
    status: { type: String, enum: PAYMENT_STATUSES, default: "PENDING", index: true },
    paidAt: { type: Date, default: null },
    paymentMode: { type: String, enum: PAYMENT_MODES, default: "UPI" },
    transactionRef: { type: String, default: "", trim: true },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

installmentPaymentSchema.index({ installment: 1, member: 1 }, { unique: true });

export type InstallmentPaymentDoc = InferSchemaType<typeof installmentPaymentSchema>;
export const InstallmentPayment = model("InstallmentPayment", installmentPaymentSchema);
