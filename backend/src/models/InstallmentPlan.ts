import { Schema, model, type InferSchemaType } from "mongoose";

export const INSTALLMENT_PLAN_TYPES = ["SEASON_MILESTONE", "MONTHLY_CHIT"] as const;
export type InstallmentPlanType = (typeof INSTALLMENT_PLAN_TYPES)[number];

const installmentPlanSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    season: { type: String, default: "2026-27", trim: true },
    planType: {
      type: String,
      enum: INSTALLMENT_PLAN_TYPES,
      default: "SEASON_MILESTONE",
      index: true,
    },
    billingMonth: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

installmentPlanSchema.index({ season: 1, active: 1 });

export type InstallmentPlanDoc = InferSchemaType<typeof installmentPlanSchema>;
export const InstallmentPlan = model("InstallmentPlan", installmentPlanSchema);
