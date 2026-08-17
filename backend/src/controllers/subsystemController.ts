import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subsystem } from "../models/Subsystem.js";
import { ApiError } from "../utils/ApiError.js";

export const listSubsystems = asyncHandler(async (_req: Request, res: Response) => {
  const subsystems = await Subsystem.find({ active: true }).sort("name").lean();
  res.json({ subsystems });
});

export const createSubsystem = asyncHandler(async (req: Request, res: Response) => {
  const existing = await Subsystem.findOne({ name: req.body.name.trim() });
  if (existing) throw ApiError.conflict("A subsystem with this name already exists");
  const subsystem = await Subsystem.create(req.body);
  res.status(201).json({ subsystem });
});

export const updateSubsystem = asyncHandler(async (req: Request, res: Response) => {
  const subsystem = await Subsystem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!subsystem) throw ApiError.notFound("Subsystem not found");
  res.json({ subsystem });
});
