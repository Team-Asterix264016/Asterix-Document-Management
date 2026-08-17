import { Bill } from "../models/Bill.js";

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  subsystem?: string;
  vendor?: string;
  user?: string;
  status?: string;
}

function buildMatch(filters: AnalyticsFilters, statusOverride?: string | string[]) {
  const match: Record<string, unknown> = {};
  if (statusOverride) match.status = Array.isArray(statusOverride) ? { $in: statusOverride } : statusOverride;
  else if (filters.status) match.status = filters.status;

  if (filters.subsystem) match.subsystem = filters.subsystem;
  if (filters.user) match.uploadedBy = filters.user;
  if (filters.vendor) match.vendorNormalized = filters.vendor;
  if (filters.dateFrom || filters.dateTo) {
    match.billDate = {};
    if (filters.dateFrom) (match.billDate as Record<string, Date>).$gte = new Date(filters.dateFrom);
    if (filters.dateTo) (match.billDate as Record<string, Date>).$lte = new Date(filters.dateTo);
  }
  return match;
}

export async function getSummary(filters: AnalyticsFilters) {
  const [approved, pending, rejected, avgApproved] = await Promise.all([
    Bill.aggregate([{ $match: buildMatch(filters, "APPROVED") }, { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }]),
    Bill.aggregate([{ $match: buildMatch(filters, "PENDING_APPROVAL") }, { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }]),
    Bill.aggregate([{ $match: buildMatch(filters, "REJECTED") }, { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }]),
    Bill.aggregate([{ $match: buildMatch(filters, "APPROVED") }, { $group: { _id: null, avg: { $avg: "$totalAmount" } } }]),
  ]);

  const totalBills = await Bill.countDocuments(buildMatch(filters));

  return {
    approvedExpenditure: approved[0]?.total ?? 0,
    approvedCount: approved[0]?.count ?? 0,
    pendingExpenditure: pending[0]?.total ?? 0,
    pendingCount: pending[0]?.count ?? 0,
    rejectedExpenditure: rejected[0]?.total ?? 0,
    rejectedCount: rejected[0]?.count ?? 0,
    totalBills,
    averageApprovedBillValue: avgApproved[0]?.avg ?? 0,
  };
}

export async function getSpendingBySubsystem(filters: AnalyticsFilters) {
  return Bill.aggregate([
    { $match: buildMatch(filters, "APPROVED") },
    { $group: { _id: "$subsystemNameAtSubmission", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $project: { _id: 0, subsystem: { $ifNull: ["$_id", "Uncategorized"] }, total: 1, count: 1 } },
  ]);
}

export async function getSpendingByMonth(filters: AnalyticsFilters) {
  const match = buildMatch(filters, "APPROVED");
  match.billDate = { $ne: null, ...(match.billDate as object) };

  return Bill.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$billDate" } },
        total: { $sum: "$totalAmount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: "$_id", total: 1, count: 1 } },
  ]);
}

export async function getSpendingByVendor(filters: AnalyticsFilters) {
  return Bill.aggregate([
    { $match: buildMatch(filters, "APPROVED") },
    { $group: { _id: "$vendorNormalized", displayName: { $first: "$vendor" }, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 25 },
    { $project: { _id: 0, vendor: { $ifNull: ["$displayName", "Unknown"] }, total: 1, count: 1 } },
  ]);
}

export async function getSpendingByUser(filters: AnalyticsFilters) {
  return Bill.aggregate([
    { $match: buildMatch(filters, "APPROVED") },
    { $group: { _id: "$uploadedBy", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $sort: { total: -1 } },
    { $project: { _id: 0, user: "$user.displayName", total: 1, count: 1 } },
  ]);
}

export async function getApprovalStats(filters: AnalyticsFilters) {
  const [pendingCount, approvedCount, rejectedCount, turnaround] = await Promise.all([
    Bill.countDocuments(buildMatch(filters, "PENDING_APPROVAL")),
    Bill.countDocuments(buildMatch(filters, "APPROVED")),
    Bill.countDocuments(buildMatch(filters, "REJECTED")),
    Bill.aggregate([
      { $match: { ...buildMatch(filters), status: { $in: ["APPROVED", "REJECTED"] }, submittedAt: { $ne: null } } },
      {
        $project: {
          hours: {
            $divide: [
              { $subtract: [{ $ifNull: ["$approvedAt", "$rejectedAt"] }, "$submittedAt"] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      { $group: { _id: null, avgHours: { $avg: "$hours" } } },
    ]),
  ]);

  return {
    pendingCount,
    approvedCount,
    rejectedCount,
    averageApprovalTurnaroundHours: turnaround[0]?.avgHours ?? null,
  };
}
