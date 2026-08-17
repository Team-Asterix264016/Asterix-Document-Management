import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as analyticsService from "../services/analyticsService.js";

export const summary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await analyticsService.getSummary(req.query as never));
});

export const categories = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await analyticsService.getSpendingBySubsystem(req.query as never) });
});

export const monthly = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await analyticsService.getSpendingByMonth(req.query as never) });
});

export const vendors = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await analyticsService.getSpendingByVendor(req.query as never) });
});

export const users = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await analyticsService.getSpendingByUser(req.query as never) });
});

export const approvals = asyncHandler(async (req: Request, res: Response) => {
  res.json(await analyticsService.getApprovalStats(req.query as never));
});
