import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as reportService from "../services/reportService.js";
import { env } from "../config/env.js";

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

export const getDriveFolder = asyncHandler(async (_req: Request, res: Response) => {
  const folderId = env.googleDriveRootFolderId;
  const url = folderId ? `https://drive.google.com/drive/folders/${folderId}` : null;
  res.json({ folderId, url });
});
