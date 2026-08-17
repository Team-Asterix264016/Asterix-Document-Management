import { Schema, model, type InferSchemaType } from "mongoose";

const reportSchema = new Schema(
  {
    type: { type: String, enum: ["SUBSYSTEM", "MONTHLY", "SUMMARY"], required: true, index: true },
    key: { type: String, required: true, index: true }, // e.g. subsystem id, or "2027-08"
    label: { type: String, required: true },
    driveFileId: { type: String, default: null },
    driveUrl: { type: String, default: null },
    generatedAt: { type: Date, default: Date.now },
    totals: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

reportSchema.index({ type: 1, key: 1 }, { unique: true });

export type ReportDoc = InferSchemaType<typeof reportSchema>;
export const Report = model("Report", reportSchema);
