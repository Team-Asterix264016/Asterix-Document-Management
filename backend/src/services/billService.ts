import crypto from "node:crypto";
import { Bill, type BillStatus } from "../models/Bill.js";
import { Subsystem } from "../models/Subsystem.js";
import { Vendor, normalizeVendorName } from "../models/Vendor.js";
import { ApiError } from "../utils/ApiError.js";
import { extractBillData } from "./geminiService.js";
import {
  getPendingEvidenceFolder,
  getApprovedFolderForSubsystem,
  getRejectedFolder,
  moveFile,
  uploadFile,
} from "./driveService.js";
import { buildBillFilename, extensionFromMime } from "../utils/filename.js";
import { findPossibleDuplicates } from "./duplicateService.js";
import { onBillApproved } from "./reportService.js";
import type { Types } from "mongoose";

export async function createDraftBill(userId: string, data: { vendor?: string | null; invoiceNumber?: string | null; billDate?: string | null; description?: string | null }) {
  const bill = await Bill.create({
    uploadedBy: userId,
    status: "DRAFT",
    vendor: data.vendor ?? null,
    vendorNormalized: data.vendor ? normalizeVendorName(data.vendor) : null,
    invoiceNumber: data.invoiceNumber ?? null,
    billDate: data.billDate ? new Date(data.billDate) : null,
    description: data.description ?? "",
  });
  return bill;
}

export async function getBillOrThrow(id: string) {
  const bill = await Bill.findById(id);
  if (!bill) throw ApiError.notFound("Bill not found");
  return bill;
}

/**
 * Attaches uploaded files to a bill, uploads originals to Drive's pending-evidence area,
 * marks the bill PROCESSING, then kicks off AI extraction without blocking the response
 * (Render has no built-in queue; a stored PROCESSING status + client polling is enough at this scale).
 */
export async function attachFilesAndProcess(
  billId: string,
  files: Array<{ buffer: Buffer; mimetype: string; originalname: string }>
) {
  const bill = await getBillOrThrow(billId);
  if (!["DRAFT", "PROCESSING"].includes(bill.status)) {
    throw ApiError.badRequest("Files can only be added while the bill is in draft");
  }

  const pendingFolderId = await tryGetPendingFolder();

  const attachments = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");
    const ext = extensionFromMime(file.mimetype);
    const filename = buildBillFilename({
      billDate: bill.billDate ?? null,
      vendor: bill.vendor ?? null,
      subsystemName: null,
      totalAmount: bill.totalAmount ?? null,
      index: files.length > 1 ? i + 1 : undefined,
      extension: ext,
    });

    let driveFileId: string | null = null;
    let driveUrl: string | null = null;
    if (pendingFolderId) {
      const uploaded = await uploadFile({ name: filename, mimeType: file.mimetype, buffer: file.buffer, parentId: pendingFolderId });
      driveFileId = uploaded.fileId;
      driveUrl = uploaded.webViewLink;
    }

    attachments.push({
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.buffer.length,
      fileHash: hash,
      driveFileId,
      driveUrl,
      order: i,
    });
  }

  bill.attachments.push(...(attachments as unknown as (typeof bill.attachments)[number][]));
  bill.status = "PROCESSING";
  bill.drive!.status = pendingFolderId ? "SYNCED" : "FAILED";
  await bill.save();

  // Fire-and-forget: extraction result is polled via GET /api/bills/:id.
  const buffersForAi = files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype }));
  runAiExtraction(bill.id, buffersForAi).catch((err) => {
    console.error(`AI extraction failed for bill ${bill.id}:`, err);
  });

  return bill;
}

async function tryGetPendingFolder(): Promise<string | null> {
  try {
    return await getPendingEvidenceFolder();
  } catch (err) {
    console.error("Drive not configured or unavailable; evidence upload skipped:", (err as Error).message);
    return null;
  }
}

async function runAiExtraction(billId: string, files: Array<{ buffer: Buffer; mimeType: string }>) {
  const bill = await Bill.findById(billId);
  if (!bill) return;

  // The bill has moved on (submitted/decided) or the user already started editing it manually —
  // AI suggestions must never override a user's authoritative values (see spec §71/§98).
  if (!["DRAFT", "PROCESSING"].includes(bill.status) || bill.userEdited) {
    return;
  }

  const subsystems = await Subsystem.find({ active: true }).select("name").lean();
  const subsystemNames = subsystems.map((s) => s.name);

  try {
    const result = await extractBillData(files, subsystemNames);

    bill.vendor = result.vendor;
    bill.vendorNormalized = result.vendor ? normalizeVendorName(result.vendor) : null;
    bill.invoiceNumber = result.invoiceNumber;
    bill.billDate = result.billDate ? new Date(result.billDate) : null;
    bill.description = result.description ?? "";
    bill.currency = result.currency;
    bill.subtotal = result.subtotal;
    bill.tax = result.tax;
    bill.discount = result.discount;
    bill.additionalCharges = result.additionalCharges;
    bill.totalAmount = result.totalAmount;
    bill.items = result.items as never;

    bill.aiExtraction = {
      processed: true,
      confidence: result.confidence,
      suggestedSubsystem: result.suggestedSubsystem,
      suggestedNewSubsystem: result.suggestedNewSubsystem,
      warnings: result.warnings,
      processedAt: new Date(),
      error: null,
    };

    if (result.vendor && result.totalAmount != null) {
      const matches = await findPossibleDuplicates({
        _id: bill._id as Types.ObjectId,
        vendor: result.vendor,
        invoiceNumber: result.invoiceNumber,
        billDate: bill.billDate,
        totalAmount: result.totalAmount,
      });
      bill.duplicateCheck = {
        possibleDuplicate: matches.length > 0,
        matches: matches.map((m) => ({ billId: m.billId, reason: m.reason })) as never,
      };
    }

    bill.status = "DRAFT";
  } catch (err) {
    bill.aiExtraction = {
      processed: false,
      confidence: {},
      suggestedSubsystem: null,
      suggestedNewSubsystem: null,
      warnings: [],
      processedAt: new Date(),
      error: (err as Error).message || "AI processing failed",
    };
    bill.status = "DRAFT";
  }

  await bill.save();
}

export async function updateBill(billId: string, data: Record<string, unknown>) {
  const bill = await getBillOrThrow(billId);
  if (!["DRAFT", "PROCESSING"].includes(bill.status)) {
    throw ApiError.badRequest("Only draft bills can be edited. Rejected bills must be resubmitted as new drafts.");
  }
  bill.userEdited = true;

  const patch = data as {
    vendor?: string | null;
    invoiceNumber?: string | null;
    billDate?: string | null;
    description?: string | null;
    currency?: string;
    subtotal?: number | null;
    tax?: number | null;
    discount?: number | null;
    additionalCharges?: number | null;
    totalAmount?: number | null;
    items?: unknown[];
    subsystemId?: string | null;
    newSubsystemName?: string | null;
  };

  if (patch.vendor !== undefined) {
    bill.vendor = patch.vendor;
    bill.vendorNormalized = patch.vendor ? normalizeVendorName(patch.vendor) : null;
  }
  if (patch.invoiceNumber !== undefined) bill.invoiceNumber = patch.invoiceNumber;
  if (patch.billDate !== undefined) bill.billDate = patch.billDate ? new Date(patch.billDate) : null;
  if (patch.description !== undefined) bill.description = patch.description ?? "";
  if (patch.currency !== undefined) bill.currency = patch.currency;
  if (patch.subtotal !== undefined) bill.subtotal = patch.subtotal;
  if (patch.tax !== undefined) bill.tax = patch.tax;
  if (patch.discount !== undefined) bill.discount = patch.discount;
  if (patch.additionalCharges !== undefined) bill.additionalCharges = patch.additionalCharges;
  if (patch.totalAmount !== undefined) bill.totalAmount = patch.totalAmount;
  if (patch.items !== undefined) bill.items = patch.items as never;

  if (patch.newSubsystemName) {
    const existing = await Subsystem.findOne({ name: patch.newSubsystemName.trim() });
    const subsystem = existing ?? (await Subsystem.create({ name: patch.newSubsystemName.trim() }));
    bill.subsystem = subsystem._id as never;
    bill.subsystemNameAtSubmission = subsystem.name;
  } else if (patch.subsystemId) {
    const subsystem = await Subsystem.findById(patch.subsystemId);
    if (!subsystem) throw ApiError.badRequest("Selected subsystem does not exist");
    bill.subsystem = subsystem._id as never;
    bill.subsystemNameAtSubmission = subsystem.name;
  }

  await bill.save();
  return bill;
}

export async function submitBill(billId: string, subsystemId: string) {
  const bill = await getBillOrThrow(billId);
  if (!["DRAFT", "PROCESSING"].includes(bill.status)) {
    throw ApiError.badRequest("Only draft bills can be submitted");
  }
  if (bill.attachments.length === 0) {
    throw ApiError.badRequest("A bill must have at least one piece of evidence, or use manual entry with all fields filled");
  }
  if (bill.totalAmount == null) {
    throw ApiError.badRequest("Total amount is required before submission");
  }

  const subsystem = await Subsystem.findById(subsystemId);
  if (!subsystem) throw ApiError.badRequest("Selected subsystem does not exist");

  bill.subsystem = subsystem._id as never;
  bill.subsystemNameAtSubmission = subsystem.name;
  bill.status = "PENDING_APPROVAL";
  bill.submittedAt = new Date();

  if (bill.vendor) {
    const normalized = normalizeVendorName(bill.vendor);
    await Vendor.findOneAndUpdate(
      { normalizedName: normalized },
      { $setOnInsert: { displayName: bill.vendor, normalizedName: normalized } },
      { upsert: true }
    );
  }

  await bill.save();
  return bill;
}

export async function approveBill(billId: string, treasurerId: string) {
  const bill = await getBillOrThrow(billId);
  if (bill.status !== "PENDING_APPROVAL") {
    throw ApiError.badRequest("Only bills pending approval can be accepted");
  }

  bill.status = "APPROVED";
  bill.approvedAt = new Date();
  bill.decidedBy = treasurerId as never;
  await bill.save();

  // Evidence relocation and report updates must never undo the approval decision.
  try {
    await relocateEvidence(bill, "APPROVED");
  } catch (err) {
    console.error(`Drive relocation failed for approved bill ${bill.id}:`, err);
    bill.drive!.status = "FAILED";
    await bill.save();
  }

  try {
    await onBillApproved(bill);
  } catch (err) {
    console.error(`Report update failed for approved bill ${bill.id}:`, err);
  }

  return bill;
}

export async function rejectBill(billId: string, treasurerId: string, reason?: string) {
  const bill = await getBillOrThrow(billId);
  if (bill.status !== "PENDING_APPROVAL") {
    throw ApiError.badRequest("Only bills pending approval can be rejected");
  }

  bill.status = "REJECTED";
  bill.rejectedAt = new Date();
  bill.rejectionReason = reason ?? null;
  bill.decidedBy = treasurerId as never;
  await bill.save();

  try {
    await relocateEvidence(bill, "REJECTED");
  } catch (err) {
    console.error(`Drive relocation failed for rejected bill ${bill.id}:`, err);
    bill.drive!.status = "FAILED";
    await bill.save();
  }

  return bill;
}

async function relocateEvidence(bill: InstanceType<typeof Bill>, decision: "APPROVED" | "REJECTED") {
  if (bill.attachments.length === 0) return;

  const pendingFolderId = await getPendingEvidenceFolder();
  const targetFolderId =
    decision === "APPROVED"
      ? await getApprovedFolderForSubsystem(bill.subsystemNameAtSubmission ?? "Other")
      : await getRejectedFolder();

  for (const attachment of bill.attachments) {
    if (!attachment.driveFileId) continue;
    await moveFile(attachment.driveFileId, pendingFolderId, targetFolderId);
  }

  if (decision === "APPROVED") bill.drive!.approvedFolderId = targetFolderId;
  else bill.drive!.rejectedFolderId = targetFolderId;
  bill.drive!.status = "SYNCED";
  await bill.save();
}

export interface BillListFilters {
  status?: string;
  subsystem?: string;
  vendor?: string;
  q?: string;
  uploadedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
  sort?: string;
}

export async function listBills(filters: BillListFilters, scope: { userId: string; role: "MEMBER" | "TREASURER" }) {
  const query: Record<string, unknown> = {};

  if (scope.role === "MEMBER") {
    query.uploadedBy = scope.userId;
  } else if (filters.uploadedBy) {
    query.uploadedBy = filters.uploadedBy;
  }

  if (filters.status) query.status = filters.status;
  if (filters.subsystem) query.subsystem = filters.subsystem;
  if (filters.vendor) query.vendorNormalized = normalizeVendorName(filters.vendor);
  if (filters.q) query.$text = { $search: filters.q };
  if (filters.dateFrom || filters.dateTo) {
    query.billDate = {};
    if (filters.dateFrom) (query.billDate as Record<string, Date>).$gte = new Date(filters.dateFrom);
    if (filters.dateTo) (query.billDate as Record<string, Date>).$lte = new Date(filters.dateTo);
  }

  const sort = filters.sort ?? "-createdAt";
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await Promise.all([
    Bill.find(query).sort(sort).skip(skip).limit(filters.limit).populate("subsystem", "name").populate("uploadedBy", "displayName username").lean(),
    Bill.countDocuments(query),
  ]);

  return { items, total, page: filters.page, limit: filters.limit, pages: Math.ceil(total / filters.limit) };
}

export function assertCanViewBill(bill: { uploadedBy: unknown }, scope: { userId: string; role: "MEMBER" | "TREASURER" }) {
  if (scope.role === "TREASURER") return;
  if (String(bill.uploadedBy) !== scope.userId) {
    throw ApiError.forbidden("You can only view your own bills");
  }
}

export type { BillStatus };
