import ExcelJS from "exceljs";
import { Bill } from "../models/Bill.js";
import { Subsystem } from "../models/Subsystem.js";
import { Report } from "../models/Report.js";
import { PROJECT_NAME } from "../config/env.js";
import { formatINR } from "../utils/currency.js";
import { getMonthlyReportFolder, getSubsystemReportFolder, uploadFile } from "./driveService.js";
import type { Types } from "mongoose";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabelOf(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
}

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } },
  alignment: { vertical: "middle" },
};

function addTitleBlock(sheet: ExcelJS.Worksheet, title: string, subtitle: string) {
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = PROJECT_NAME;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = title;
  sheet.getCell("A2").font = { bold: true, size: 12, color: { argb: "FF6B7280" } };

  sheet.mergeCells("A3:H3");
  sheet.getCell("A3").value = subtitle;
  sheet.getCell("A3").font = { italic: true, size: 10, color: { argb: "FF9CA3AF" } };

  sheet.addRow([]);
}

function addBillRows(sheet: ExcelJS.Worksheet, bills: Array<Record<string, unknown>>) {
  const headerRow = sheet.addRow(["Date", "Vendor", "Bill No", "Description", "Subsystem", "Amount", "Submitted By", "Status", "Evidence"]);
  headerRow.eachCell((cell) => Object.assign(cell, { style: HEADER_STYLE }));

  for (const bill of bills) {
    const row = sheet.addRow([
      bill.billDate ? new Date(bill.billDate as string).toLocaleDateString("en-IN") : "",
      bill.vendor ?? "",
      bill.invoiceNumber ?? "",
      bill.description ?? "",
      (bill.subsystemNameAtSubmission as string) ?? "",
      bill.totalAmount ?? 0,
      ((bill.uploadedBy as { displayName?: string })?.displayName) ?? "",
      bill.status,
      ((bill.attachments as Array<{ driveUrl?: string }>)?.[0]?.driveUrl) ?? "",
    ]);
    row.getCell(6).numFmt = "#,##0.00";
  }

  sheet.columns.forEach((col) => {
    col.width = 18;
  });
  sheet.getColumn(4).width = 30;
}

function addSummaryBlock(sheet: ExcelJS.Worksheet, rows: Array<[string, string | number]>) {
  for (const [label, value] of rows) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  }
  sheet.addRow([]);
}

export async function generateSubsystemReportBuffer(subsystemId: string) {
  const subsystem = await Subsystem.findById(subsystemId);
  if (!subsystem) throw new Error("Subsystem not found");

  const bills = await Bill.find({ subsystem: subsystemId, status: "APPROVED" })
    .sort("billDate")
    .populate("uploadedBy", "displayName")
    .lean();

  const total = bills.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(subsystem.name.slice(0, 31));

  addTitleBlock(sheet, `${subsystem.name} Subsystem Expense Report`, `Generated ${new Date().toLocaleString("en-IN")}`);
  addSummaryBlock(sheet, [
    ["Total Bills", bills.length],
    ["Total Expenditure", formatINR(total)],
    ["Average Bill", formatINR(bills.length ? total / bills.length : 0)],
  ]);
  addBillRows(sheet, bills as never);

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), subsystem, bills, total };
}

export async function generateMonthlyReportBuffer(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const bills = await Bill.find({ status: "APPROVED", billDate: { $gte: start, $lt: end } })
    .sort("billDate")
    .populate("uploadedBy", "displayName")
    .lean();

  const total = bills.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);
  const bySubsystem = new Map<string, number>();
  for (const b of bills) {
    const key = b.subsystemNameAtSubmission ?? "Other";
    bySubsystem.set(key, (bySubsystem.get(key) ?? 0) + (b.totalAmount ?? 0));
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(monthLabelOf(monthKey).slice(0, 31));

  addTitleBlock(sheet, `${monthLabelOf(monthKey)} Expense Report`, `Generated ${new Date().toLocaleString("en-IN")}`);
  addSummaryBlock(sheet, [
    ["Total Bills", bills.length],
    ["Total Expenditure", formatINR(total)],
    ...Array.from(bySubsystem.entries()).map(([name, amt]) => [name, formatINR(amt)] as [string, string]),
  ]);
  addBillRows(sheet, bills as never);

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), monthKey, bills, total, bySubsystem };
}

async function persistReport(type: "SUBSYSTEM" | "MONTHLY", key: string, label: string, buffer: Buffer, totals: Record<string, unknown>) {
  let driveFileId: string | null = null;
  let driveUrl: string | null = null;

  try {
    const folderId = type === "SUBSYSTEM" ? await getSubsystemReportFolder(label) : await getMonthlyReportFolder(label);
    const uploaded = await uploadFile({
      name: `${label.replace(/[^a-zA-Z0-9 -]/g, "")} Report.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
      parentId: folderId,
    });
    driveFileId = uploaded.fileId;
    driveUrl = uploaded.webViewLink;
  } catch (err) {
    console.error(`Report Drive upload skipped/failed for ${type} ${key}:`, (err as Error).message);
  }

  await Report.findOneAndUpdate(
    { type, key },
    { type, key, label, driveFileId, driveUrl, generatedAt: new Date(), totals },
    { upsert: true }
  );
}

/** Regenerates the subsystem and monthly reports affected by a newly approved bill. Idempotent. */
export async function onBillApproved(bill: { subsystem?: Types.ObjectId | null; billDate?: Date | null }) {
  if (bill.subsystem) {
    const { buffer, subsystem, total, bills } = await generateSubsystemReportBuffer(String(bill.subsystem));
    await persistReport("SUBSYSTEM", String(subsystem._id), subsystem.name, buffer, { total, count: bills.length });
  }
  if (bill.billDate) {
    const key = monthKeyOf(bill.billDate);
    const { buffer, total, bills } = await generateMonthlyReportBuffer(key);
    await persistReport("MONTHLY", key, monthLabelOf(key), buffer, { total, count: bills.length });
  }
}

export async function regenerateAllReports() {
  const subsystems = await Subsystem.find({ active: true }).lean();
  for (const s of subsystems) {
    const { buffer, total, bills } = await generateSubsystemReportBuffer(String(s._id));
    await persistReport("SUBSYSTEM", String(s._id), s.name, buffer, { total, count: bills.length });
  }

  const months = await Bill.aggregate<{ _id: string }>([
    { $match: { status: "APPROVED", billDate: { $ne: null } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$billDate" } } } },
  ]);
  for (const m of months) {
    const { buffer, total, bills } = await generateMonthlyReportBuffer(m._id);
    await persistReport("MONTHLY", m._id, monthLabelOf(m._id), buffer, { total, count: bills.length });
  }

  return { subsystems: subsystems.length, months: months.length };
}

export async function listReports(type?: "SUBSYSTEM" | "MONTHLY") {
  const query = type ? { type } : {};
  return Report.find(query).sort({ type: 1, key: -1 }).lean();
}

/** Ad hoc export buffer for a caller-supplied bill set (used by the Excel export endpoints). */
export async function buildBillExportBuffer(title: string, bills: Array<Record<string, unknown>>) {
  const total = bills.reduce((sum, b) => sum + ((b.totalAmount as number) ?? 0), 0);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));

  addTitleBlock(sheet, title, `Generated ${new Date().toLocaleString("en-IN")}`);
  addSummaryBlock(sheet, [
    ["Total Bills", bills.length],
    ["Total Expenditure", formatINR(total)],
    ["Average Bill", formatINR(bills.length ? total / bills.length : 0)],
  ]);
  addBillRows(sheet, bills);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
