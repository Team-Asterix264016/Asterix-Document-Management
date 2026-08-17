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

export const queryBillsAi = asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Query string is required" });
    return;
  }

  // Filter by user role if member
  const filter: Record<string, unknown> = {};
  if (req.user?.role === "MEMBER") {
    filter.uploadedBy = req.user.sub;
  }

  const { Bill } = await import("../models/Bill.js");
  const { queryBillsWithAi } = await import("../services/geminiService.js");

  const bills = await Bill.find(filter).populate("subsystem", "name code").lean();

  const billsSummary = bills.map((b: any) => ({
    billNumber: b.invoiceNumber || String(b._id),
    vendorName: b.vendor || "Unknown Vendor",
    subsystem: (b.subsystem as any)?.name ?? "Unassigned",
    amount: b.totalAmount ?? 0,
    date: b.billDate ? new Date(b.billDate).toISOString().split("T")[0] : "N/A",
    status: b.status,
    rejectionReason: b.rejectionReason,
  }));

  const result = await queryBillsWithAi(query, billsSummary);

  const matchingBills = bills.filter((b: any) =>
    result.matchingBillNumbers.includes(b.invoiceNumber || String(b._id))
  );

  res.json({
    answer: result.answer,
    matchingBills: matchingBills.map((b: any) => ({
      id: b._id,
      billNumber: b.invoiceNumber || String(b._id),
      vendorName: b.vendor || "Unknown Vendor",
      amount: b.totalAmount ?? 0,
      status: b.status,
      subsystem: (b.subsystem as any)?.name,
      date: b.billDate,
    })),
  });
});
