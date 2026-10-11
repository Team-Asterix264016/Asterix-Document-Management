import { Schema, model, type InferSchemaType } from "mongoose";

export const EVENT_STATUSES = ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export function computeEventStatus(
  startDate?: Date | string | null,
  endDate?: Date | string | null,
  manualStatus?: string
): EventStatus {
  if (manualStatus === "CANCELLED") return "CANCELLED";
  if (!startDate) return "UPCOMING";

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const s = new Date(startDate);
  const e = endDate ? new Date(endDate) : s;

  const startStr = isNaN(s.getTime()) ? todayStr : s.toISOString().split("T")[0];
  const endStr = isNaN(e.getTime()) ? startStr : e.toISOString().split("T")[0];

  if (todayStr < startStr) {
    return "UPCOMING";
  } else if (todayStr > endStr) {
    return "COMPLETED";
  } else {
    return "ONGOING";
  }
}

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
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    date: { type: Date, default: Date.now }, // synchronized with startDate for backwards compatibility
    sessionsCount: { type: Number, default: 1, min: 1 },
    location: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    status: { type: String, enum: EVENT_STATUSES, default: "UPCOMING" },
    tiers: { type: [eventTierSchema], default: [] },
    totalRevenue: { type: Number, default: 0, min: 0 },
    totalParticipants: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

incomeEventSchema.pre("save", function () {
  if (!this.startDate && this.date) {
    this.startDate = this.date;
  }
  if (!this.endDate) {
    this.endDate = this.startDate || this.date;
  }
  if (!this.date && this.startDate) {
    this.date = this.startDate;
  }

  if (this.status !== "CANCELLED") {
    this.status = computeEventStatus(this.startDate, this.endDate, this.status);
  }

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
