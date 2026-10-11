import { Schema, model, type InferSchemaType } from "mongoose";

const treasuryConfigSchema = new Schema(
  {
    season: { type: String, default: "2026-27", unique: true, trim: true },
    targetPerMember: { type: Number, default: 10000, min: 0 },
    currency: { type: String, default: "INR", trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export type TreasuryConfigDoc = InferSchemaType<typeof treasuryConfigSchema>;
export const TreasuryConfig = model("TreasuryConfig", treasuryConfigSchema);
