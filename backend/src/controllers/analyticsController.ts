import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as analyticsService from "../services/analyticsService.js";
import { Bill } from "../models/Bill.js";
import { queryBillsWithAi } from "../services/geminiService.js";

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

// Capped so prompt size (and Gemini cost/latency) stays bounded no matter how many bills the
// project accumulates over its lifetime — see spec §69 on Gemini quota efficiency.
const AI_QUERY_BILL_LIMIT = 300;

export const queryBillsAi = asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.body as { query: string };

  const filter: Record<string, unknown> = {};
  if (req.user?.role === "MEMBER") {
    filter.uploadedBy = req.user.sub;
  }

  const totalCount = await Bill.countDocuments(filter);
  const bills = await Bill.find(filter)
    .sort({ billDate: -1, createdAt: -1 })
    .limit(AI_QUERY_BILL_LIMIT)
    .populate<{ subsystem: { name: string } | null }>("subsystem", "name")
    .lean();

  const billsSummary = bills.map((b) => ({
    billNumber: b.invoiceNumber || String(b._id),
    vendorName: b.vendor || "Unknown Vendor",
    subsystem: b.subsystem?.name ?? b.subsystemNameAtSubmission ?? "Unassigned",
    amount: b.totalAmount ?? 0,
    date: b.billDate ? new Date(b.billDate).toISOString().split("T")[0] : "N/A",
    status: b.status,
    rejectionReason: b.rejectionReason ?? undefined,
  }));

  const result = await queryBillsWithAi(query, billsSummary, totalCount);

  const matchingBillNumbers = new Set(result.matchingBillNumbers);
  const matchingBills = bills.filter((b) => matchingBillNumbers.has(b.invoiceNumber || String(b._id)));

  res.json({
    answer: result.answer,
    matchingBills: matchingBills.map((b) => ({
      id: String(b._id),
      billNumber: b.invoiceNumber || String(b._id),
      vendorName: b.vendor || "Unknown Vendor",
      amount: b.totalAmount ?? 0,
      status: b.status,
      subsystem: b.subsystem?.name ?? b.subsystemNameAtSubmission ?? undefined,
      date: b.billDate,
    })),
  });
});
