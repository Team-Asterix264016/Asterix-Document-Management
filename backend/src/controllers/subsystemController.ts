import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subsystem, SUBSYSTEM_NAME_COLLATION } from "../models/Subsystem.js";
import { ApiError } from "../utils/ApiError.js";

export const listSubsystems = asyncHandler(async (_req: Request, res: Response) => {
  const subsystems = await Subsystem.find({ active: true }).sort("name").lean();
  res.json({ subsystems });
});

export const createSubsystem = asyncHandler(async (req: Request, res: Response) => {
  const name = req.body.name.trim();
  // Case-insensitive check up front (covers the common case); the collated unique index is the
  // actual race-safe guarantee — a concurrent duplicate still surfaces as a clean 409, not a 500.
  const existing = await Subsystem.findOne({ name }).collation(SUBSYSTEM_NAME_COLLATION);
  if (existing) throw ApiError.conflict("A subsystem with this name already exists");
  const subsystem = await Subsystem.create({ ...req.body, name });
  res.status(201).json({ subsystem });
});

export const updateSubsystem = asyncHandler(async (req: Request, res: Response) => {
  const subsystem = await Subsystem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!subsystem) throw ApiError.notFound("Subsystem not found");
  res.json({ subsystem });
});
