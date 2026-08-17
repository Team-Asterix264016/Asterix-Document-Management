import { Schema, model, type InferSchemaType } from "mongoose";

const subsystemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    parentBroadCategory: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Case-insensitive uniqueness (strength: 2) so "Mechanical" and "mechanical" collide at the
// database level — an app-level regex check alone cannot be made atomic under concurrent
// upserts, since MongoDB's upsert-race protection only applies to the index actually backing
// the filter. See billService.findOrCreateSubsystem, which queries with this same collation.
subsystemSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export const SUBSYSTEM_NAME_COLLATION = { locale: "en", strength: 2 } as const;

export type SubsystemDoc = InferSchemaType<typeof subsystemSchema>;
export const Subsystem = model("Subsystem", subsystemSchema);

export const DEFAULT_SUBSYSTEMS = [
  "Mechanical",
  "Electrical",
  "Electronics",
  "Powertrain",
  "Vehicle",
  "Fabrication",
  "Sensors & Perception",
  "Software",
  "Safety",
  "Testing",
  "Travel / Logistics",
  "Other",
];
