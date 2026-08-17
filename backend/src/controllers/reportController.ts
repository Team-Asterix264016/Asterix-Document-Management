import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as reportService from "../services/reportService.js";

export const listSubsystemReports = asyncHandler(async (_req: Request, res: Response) => {
  const reports = await reportService.listReports("SUBSYSTEM");
  res.json({ reports });
});

export const listMonthlyReports = asyncHandler(async (_req: Request, res: Response) => {
  const reports = await reportService.listReports("MONTHLY");
  res.json({ reports });
});

export const regenerateReports = asyncHandler(async (_req: Request, res: Response) => {
  const result = await reportService.regenerateAllReports();
  res.json({ regenerated: result });
});
