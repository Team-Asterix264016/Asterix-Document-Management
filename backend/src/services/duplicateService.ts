import { Bill } from "../models/Bill.js";
import { normalizeVendorName } from "../models/Vendor.js";
import type { Types } from "mongoose";

export interface DuplicateMatch {
  billId: Types.ObjectId;
  reason: string;
}

/**
 * Algorithmic (non-AI) duplicate detection: same normalized vendor + same amount within
 * a 3-day window, or an exact invoice number match. Warning-only — never blocks submission.
 */
export async function findPossibleDuplicates(bill: {
  _id?: Types.ObjectId;
  vendor: string | null;
  invoiceNumber: string | null;
  billDate: Date | null;
  totalAmount: number | null;
}): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];
  const excludeId = bill._id;

  if (bill.invoiceNumber) {
    const invoiceMatches = await Bill.find({
      _id: { $ne: excludeId },
      invoiceNumber: bill.invoiceNumber,
      status: { $in: ["PENDING_APPROVAL", "APPROVED"] },
    })
      .select("_id")
      .lean();

    for (const m of invoiceMatches) {
      matches.push({ billId: m._id, reason: "Same invoice number" });
    }
  }

  const normalized = bill.vendor ? normalizeVendorName(bill.vendor) : "";
  if (normalized && bill.totalAmount != null && bill.billDate) {
    const windowStart = new Date(bill.billDate);
    windowStart.setDate(windowStart.getDate() - 3);
    const windowEnd = new Date(bill.billDate);
    windowEnd.setDate(windowEnd.getDate() + 3);

    const candidates = await Bill.find({
      _id: { $ne: excludeId },
      vendorNormalized: normalized,
      totalAmount: bill.totalAmount,
      billDate: { $gte: windowStart, $lte: windowEnd },
      status: { $in: ["PENDING_APPROVAL", "APPROVED"] },
    })
      .select("_id")
      .lean();

    for (const c of candidates) {
      if (!matches.some((m) => m.billId.equals(c._id))) {
        matches.push({ billId: c._id, reason: "Same vendor, amount, and nearby date" });
      }
    }
  }

  return matches;
}
