import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Bill } from "../models/Bill.js";
import { Subsystem } from "../models/Subsystem.js";
import { ApiError } from "../utils/ApiError.js";
import { buildBillExportBuffer, generateMonthlyReportBuffer, generateSubsystemReportBuffer } from "../services/reportService.js";

function sendXlsx(res: Response, filename: string, buffer: Buffer) {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

export const exportBills = asyncHandler(async (req: Request, res: Response) => {
  const query: Record<string, unknown> = { status: "APPROVED" };
  if (req.query.status) query.status = req.query.status;
  if (req.query.subsystem) query.subsystem = req.query.subsystem;

  const bills = await Bill.find(query).sort("billDate").populate("uploadedBy", "displayName").lean();
  const buffer = await buildBillExportBuffer("Bills Export", bills as never);
  sendXlsx(res, "asterix-bills-export.xlsx", buffer);
});

export const exportSubsystem = asyncHandler(async (req: Request, res: Response) => {
  const subsystem = await Subsystem.findById(req.params.id);
  if (!subsystem) throw ApiError.notFound("Subsystem not found");
  const { buffer } = await generateSubsystemReportBuffer(req.params.id);
  sendXlsx(res, `${subsystem.name}-report.xlsx`, buffer);
});

export const exportMonth = asyncHandler(async (req: Request, res: Response) => {
  const key = `${req.params.year}-${String(req.params.month).padStart(2, "0")}`;
  const { buffer } = await generateMonthlyReportBuffer(key);
  sendXlsx(res, `${key}-report.xlsx`, buffer);
});
