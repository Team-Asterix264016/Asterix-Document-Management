import { Schema, model, type InferSchemaType } from "mongoose";

const subsystemSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    parentBroadCategory: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

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
