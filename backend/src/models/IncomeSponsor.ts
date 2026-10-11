import { Schema, model, type InferSchemaType } from "mongoose";

export const SPONSOR_TIERS = [
  "TITLE",
  "PLATINUM",
  "GOLD",
  "SILVER",
  "TECHNICAL",
  "MATERIAL",
  "OTHER",
] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const SPONSOR_STATUSES = ["RECEIVED", "PLEDGED"] as const;
export type SponsorStatus = (typeof SPONSOR_STATUSES)[number];

const incomeSponsorSchema = new Schema(
  {
    sponsorName: { type: String, required: true, trim: true },
    tier: { type: String, enum: SPONSOR_TIERS, default: "SILVER" },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: SPONSOR_STATUSES, default: "RECEIVED" },
    dateReceived: { type: Date, default: Date.now },
    contactPerson: { type: String, default: "", trim: true },
    contactEmail: { type: String, default: "", trim: true },
    contactPhone: { type: String, default: "", trim: true },
    deliverables: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export type IncomeSponsorDoc = InferSchemaType<typeof incomeSponsorSchema>;
export const IncomeSponsor = model("IncomeSponsor", incomeSponsorSchema);
