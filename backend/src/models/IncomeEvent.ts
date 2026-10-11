import { Schema, model, type InferSchemaType } from "mongoose";

export const EVENT_STATUSES = ["UPCOMING", "COMPLETED", "CANCELLED"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

const eventTierSchema = new Schema(
  {
    tierName: { type: String, required: true, trim: true },
    pricePerParticipant: { type: Number, required: true, min: 0 },
    registeredCount: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: true }
);

const incomeEventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    location: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    status: { type: String, enum: EVENT_STATUSES, default: "COMPLETED" },
    tiers: { type: [eventTierSchema], default: [] },
    totalRevenue: { type: Number, default: 0, min: 0 },
    totalParticipants: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

incomeEventSchema.pre("save", function () {
  if (this.tiers && this.tiers.length > 0) {
    this.totalRevenue = this.tiers.reduce(
      (sum, tier) => sum + (tier.pricePerParticipant || 0) * (tier.registeredCount || 0),
      0
    );
    this.totalParticipants = this.tiers.reduce(
      (sum, tier) => sum + (tier.registeredCount || 0),
      0
    );
  } else {
    this.totalRevenue = 0;
    this.totalParticipants = 0;
  }
});

export type EventTier = InferSchemaType<typeof eventTierSchema>;
export type IncomeEventDoc = InferSchemaType<typeof incomeEventSchema>;
export const IncomeEvent = model("IncomeEvent", incomeEventSchema);
