import { Schema, model, type InferSchemaType } from "mongoose";

const vendorSchema = new Schema(
  {
    displayName: { type: String, required: true },
    normalizedName: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export type VendorDoc = InferSchemaType<typeof vendorSchema>;
export const Vendor = model("Vendor", vendorSchema);

export function normalizeVendorName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
