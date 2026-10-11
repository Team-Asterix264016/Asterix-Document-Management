import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { TreasuryConfig } from "../models/TreasuryConfig.js";
import { InstallmentPlan } from "../models/InstallmentPlan.js";
import { InstallmentPayment } from "../models/InstallmentPayment.js";
import { IncomeEvent, computeEventStatus } from "../models/IncomeEvent.js";
import { IncomeSponsor } from "../models/IncomeSponsor.js";
import { IncomeMisc } from "../models/IncomeMisc.js";
import { User } from "../models/User.js";
import { Bill } from "../models/Bill.js";
import { Types } from "mongoose";

// ==========================================
// 1. TREASURY CONFIGURATION & SETTINGS
// ==========================================

export const getTreasurySettings = asyncHandler(async (_req: Request, res: Response) => {
  let config = await TreasuryConfig.findOne({ season: "2026-27" });
  if (!config) {
    config = await TreasuryConfig.create({
      season: "2026-27",
      targetPerMember: 10000,
      currency: "INR",
    });
  }
  res.json({ config });
});

export const updateTreasurySettings = asyncHandler(async (req: Request, res: Response) => {
  const { targetPerMember, currency } = req.body;
  if (targetPerMember !== undefined && (typeof targetPerMember !== "number" || targetPerMember < 0)) {
    throw ApiError.badRequest("Invalid target per member amount");
  }

  const config = await TreasuryConfig.findOneAndUpdate(
    { season: "2026-27" },
    {
      ...(targetPerMember !== undefined && { targetPerMember }),
      ...(currency && { currency }),
      updatedBy: req.user?.sub ? new Types.ObjectId(req.user.sub) : null,
    },
    { new: true, upsert: true }
  );

  res.json({ config });
});

// ==========================================
// 2. UNIFIED TREASURY & INFLOW OVERVIEW
// ==========================================

export const getTreasuryOverview = asyncHandler(async (_req: Request, res: Response) => {
  // Config
  let config = await TreasuryConfig.findOne({ season: "2026-27" });
  if (!config) {
    config = await TreasuryConfig.create({ season: "2026-27", targetPerMember: 10000, currency: "INR" });
  }

  // 1. Installments Total (PAID amounts)
  const installmentPayments = await InstallmentPayment.find({ status: "PAID" }).lean();
  const totalInstallments = installmentPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  // 2. Events Total (Revenue)
  const events = await IncomeEvent.find({ status: { $ne: "CANCELLED" } }).lean();
  const totalEvents = events.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
  const totalEventParticipants = events.reduce((sum, e) => sum + (e.totalParticipants || 0), 0);

  // 3. Sponsors Total (Received vs Pledged)
  const sponsors = await IncomeSponsor.find().lean();
  const totalSponsorsReceived = sponsors
    .filter((s) => s.status === "RECEIVED")
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalSponsorsPledged = sponsors
    .filter((s) => s.status === "PLEDGED")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // 4. Misc Total
  const miscItems = await IncomeMisc.find().lean();
  const totalMisc = miscItems.reduce((sum, m) => sum + (m.amount || 0), 0);

  // Grand Total Inflow
  const totalInflow = totalInstallments + totalEvents + totalSponsorsReceived + totalMisc;

  // Total Approved Bills (Outflow)
  const approvedBills = await Bill.aggregate([
    { $match: { status: "APPROVED" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
  ]);
  const totalApprovedExpenditure = approvedBills[0]?.total ?? 0;
  const approvedBillsCount = approvedBills[0]?.count ?? 0;

  // Pending Bills
  const pendingBillsCount = await Bill.countDocuments({ status: "PENDING_APPROVAL" });

  // Net Balance
  const netBalance = totalInflow - totalApprovedExpenditure;

  // Active member stats
  const activeMembersCount = await User.countDocuments({ active: true });
  const totalExpectedInstallments = config.targetPerMember * activeMembersCount;

  // Recent Inflows (cross-avenue latest entries)
  const recentPayments = await InstallmentPayment.find({ status: "PAID" })
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(5)
    .populate<{ member: { displayName: string } }>("member", "displayName")
    .populate<{ installment: { title: string } }>("installment", "title")
    .lean();

  const recentEvents = await IncomeEvent.find({ totalRevenue: { $gt: 0 } })
    .sort({ date: -1, createdAt: -1 })
    .limit(5)
    .lean();

  const recentSponsors = await IncomeSponsor.find({ status: "RECEIVED" })
    .sort({ dateReceived: -1, createdAt: -1 })
    .limit(5)
    .lean();

  const recentMisc = await IncomeMisc.find()
    .sort({ dateReceived: -1, createdAt: -1 })
    .limit(5)
    .lean();

  type ActivityItem = {
    id: string;
    type: "INSTALLMENT" | "EVENT" | "SPONSOR" | "MISC";
    title: string;
    amount: number;
    date: Date;
    meta?: string;
  };

  const combinedActivities: ActivityItem[] = [
    ...recentPayments.map((p) => ({
      id: String(p._id),
      type: "INSTALLMENT" as const,
      title: `${p.member?.displayName ?? "Member"} (${p.installment?.title ?? "Installment"})`,
      amount: p.amountPaid,
      date: p.paidAt || p.createdAt,
      meta: p.paymentMode,
    })),
    ...recentEvents.map((e) => ({
      id: String(e._id),
      type: "EVENT" as const,
      title: e.title,
      amount: e.totalRevenue,
      date: (e.startDate || e.date || e.createdAt) as Date,
      meta: `${e.totalParticipants} attendees`,
    })),
    ...recentSponsors.map((s) => ({
      id: String(s._id),
      type: "SPONSOR" as const,
      title: `${s.sponsorName} (${s.tier})`,
      amount: s.amount,
      date: s.dateReceived,
      meta: s.status,
    })),
    ...recentMisc.map((m) => ({
      id: String(m._id),
      type: "MISC" as const,
      title: m.title,
      amount: m.amount,
      date: m.dateReceived,
      meta: m.category,
    })),
  ];

  combinedActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentInflows = combinedActivities.slice(0, 8);

  res.json({
    config: {
      season: config.season,
      targetPerMember: config.targetPerMember,
      currency: config.currency,
      activeMembersCount,
    },
    inflow: {
      total: totalInflow,
      breakdown: {
        installments: totalInstallments,
        events: totalEvents,
        sponsorsReceived: totalSponsorsReceived,
        sponsorsPledged: totalSponsorsPledged,
        misc: totalMisc,
      },
      installmentsProgress: {
        expectedTotal: totalExpectedInstallments,
        collected: totalInstallments,
        percentage: totalExpectedInstallments > 0 ? Math.round((totalInstallments / totalExpectedInstallments) * 100) : 0,
        pending: Math.max(0, totalExpectedInstallments - totalInstallments),
      },
      eventsSummary: {
        count: events.length,
        totalParticipants: totalEventParticipants,
      },
    },
    outflow: {
      totalApproved: totalApprovedExpenditure,
      approvedCount: approvedBillsCount,
      pendingCount: pendingBillsCount,
    },
    netBalance,
    recentInflows,
  });
});

// ==========================================
// 3. INSTALLMENTS (PLANS & MEMBER MATRIX)
// ==========================================

export const getInstallmentPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await InstallmentPlan.find({ season: "2026-27" }).sort({ dueDate: 1, createdAt: 1 }).lean();
  res.json({ items: plans });
});

export const createInstallmentPlan = asyncHandler(async (req: Request, res: Response) => {
  const { title, amount, dueDate, description, season, planType, billingMonth } = req.body;
  if (!title?.trim()) throw ApiError.badRequest("Title is required");
  if (typeof amount !== "number" || amount <= 0) throw ApiError.badRequest("Amount must be greater than 0");
  if (!dueDate) throw ApiError.badRequest("Due date is required");

  const effectiveType = planType === "MONTHLY_CHIT" ? "MONTHLY_CHIT" : "SEASON_MILESTONE";

  const plan = await InstallmentPlan.create({
    title: title.trim(),
    amount,
    dueDate: new Date(dueDate),
    description: description?.trim() || "",
    season: season?.trim() || "2026-27",
    planType: effectiveType,
    billingMonth: billingMonth?.trim() || "",
    createdBy: req.user?.sub ? new Types.ObjectId(req.user.sub) : undefined,
  });

  res.status(201).json({ item: plan });
});

export const updateInstallmentPlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, amount, dueDate, description, active, planType, billingMonth } = req.body;

  const plan = await InstallmentPlan.findById(id);
  if (!plan) throw ApiError.notFound("Installment plan not found");

  if (title !== undefined) plan.title = title.trim();
  if (amount !== undefined) {
    if (typeof amount !== "number" || amount <= 0) throw ApiError.badRequest("Amount must be > 0");
    plan.amount = amount;
  }
  if (dueDate !== undefined) plan.dueDate = new Date(dueDate);
  if (description !== undefined) plan.description = description.trim();
  if (active !== undefined) plan.active = Boolean(active);
  if (planType !== undefined) plan.planType = planType === "MONTHLY_CHIT" ? "MONTHLY_CHIT" : "SEASON_MILESTONE";
  if (billingMonth !== undefined) plan.billingMonth = billingMonth.trim();

  await plan.save();
  res.json({ item: plan });
});

export const deleteInstallmentPlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const plan = await InstallmentPlan.findById(id);
  if (!plan) throw ApiError.notFound("Installment plan not found");

  // Check if any payments are tied to this plan
  const paymentsCount = await InstallmentPayment.countDocuments({ installment: id, status: "PAID" });
  if (paymentsCount > 0) {
    throw ApiError.badRequest(`Cannot delete milestone with ${paymentsCount} recorded payments. Mark it inactive instead.`);
  }

  await InstallmentPlan.findByIdAndDelete(id);
  await InstallmentPayment.deleteMany({ installment: id });

  res.json({ message: "Installment plan deleted successfully" });
});

export const getInstallmentsMatrix = asyncHandler(async (_req: Request, res: Response) => {
  let config = await TreasuryConfig.findOne({ season: "2026-27" });
  if (!config) {
    config = await TreasuryConfig.create({ season: "2026-27", targetPerMember: 10000, currency: "INR" });
  }

  // Active team members
  const members = await User.find({ active: true }).sort({ displayName: 1 }).lean();
  const plans = await InstallmentPlan.find({ season: "2026-27", active: true }).sort({ dueDate: 1 }).lean();
  const payments = await InstallmentPayment.find().lean();

  const paymentMap = new Map<string, typeof payments[0]>();
  payments.forEach((p) => {
    paymentMap.set(`${String(p.installment)}_${String(p.member)}`, p);
  });

  const memberMatrix = members.map((member) => {
    let totalPaid = 0;
    let milestonePaid = 0;
    let monthlyChitPaid = 0;

    const installmentsStatus = plans.map((plan) => {
      const payment = paymentMap.get(`${String(plan._id)}_${String(member._id)}`);
      const isPaid = payment?.status === "PAID";
      const paidAmt = isPaid ? (payment.amountPaid || 0) : 0;
      if (isPaid) {
        totalPaid += paidAmt;
        if (plan.planType === "MONTHLY_CHIT") {
          monthlyChitPaid += paidAmt;
        } else {
          milestonePaid += paidAmt;
        }
      }
      return {
        planId: String(plan._id),
        planTitle: plan.title,
        planAmount: plan.amount,
        planType: plan.planType || "SEASON_MILESTONE",
        billingMonth: plan.billingMonth || "",
        dueDate: plan.dueDate,
        status: isPaid ? "PAID" : "PENDING",
        amountPaid: isPaid ? payment.amountPaid : 0,
        paidAt: isPaid ? payment.paidAt : null,
        paymentMode: isPaid ? payment.paymentMode : null,
        transactionRef: isPaid ? payment.transactionRef : "",
        notes: isPaid ? payment.notes : "",
        paymentId: payment ? String(payment._id) : null,
      };
    });

    const target = config.targetPerMember;
    const remaining = Math.max(0, target - milestonePaid);
    const progressPercent = target > 0 ? Math.min(100, Math.round((milestonePaid / target) * 100)) : 100;

    return {
      memberId: String(member._id),
      displayName: member.displayName,
      username: member.username,
      role: member.role,
      totalPaid,
      milestonePaid,
      monthlyChitPaid,
      target,
      remaining,
      progressPercent,
      installments: installmentsStatus,
    };
  });

  const totalExpected = config.targetPerMember * members.length;
  const totalCollected = memberMatrix.reduce((sum, m) => sum + m.milestonePaid, 0);

  const monthlyChitPlans = plans.filter((p) => p.planType === "MONTHLY_CHIT");
  const monthlyChitTotalCollected = memberMatrix.reduce((sum, m) => sum + m.monthlyChitPaid, 0);
  const monthlyChitTotalExpected = monthlyChitPlans.reduce((sum, p) => sum + p.amount, 0) * members.length;

  res.json({
    config: {
      season: config.season,
      targetPerMember: config.targetPerMember,
      currency: config.currency,
      totalMembers: members.length,
      totalExpected,
      totalCollected,
      totalPending: Math.max(0, totalExpected - totalCollected),
      collectionPercentage: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      monthlyChitTotalCollected,
      monthlyChitTotalExpected,
      monthlyChitPlansCount: monthlyChitPlans.length,
    },
    plans,
    matrix: memberMatrix,
  });
});

export const recordInstallmentPayment = asyncHandler(async (req: Request, res: Response) => {
  const { installmentId, memberId, amountPaid, paidAt, paymentMode, transactionRef, notes } = req.body;

  if (!installmentId) throw ApiError.badRequest("Installment ID is required");
  if (!memberId) throw ApiError.badRequest("Member ID is required");

  const plan = await InstallmentPlan.findById(installmentId);
  if (!plan) throw ApiError.notFound("Installment plan not found");

  const member = await User.findById(memberId);
  if (!member) throw ApiError.notFound("Member not found");

  const amount = typeof amountPaid === "number" && amountPaid > 0 ? amountPaid : plan.amount;
  const paymentDate = paidAt ? new Date(paidAt) : new Date();

  const payment = await InstallmentPayment.findOneAndUpdate(
    { installment: plan._id, member: member._id },
    {
      amountPaid: amount,
      status: "PAID",
      paidAt: paymentDate,
      paymentMode: paymentMode || "UPI",
      transactionRef: transactionRef?.trim() || "",
      markedBy: req.user?.sub ? new Types.ObjectId(req.user.sub) : null,
      notes: notes?.trim() || "",
    },
    { new: true, upsert: true }
  );

  res.status(200).json({ payment });
});

export const deleteInstallmentPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payment = await InstallmentPayment.findById(id);
  if (!payment) throw ApiError.notFound("Payment record not found");

  await InstallmentPayment.findByIdAndDelete(id);
  res.json({ message: "Payment record reverted successfully" });
});

// ==========================================
// 4. WORKSHOPS & EVENTS
// ==========================================

export const getEvents = asyncHandler(async (_req: Request, res: Response) => {
  const rawEvents = await IncomeEvent.find().sort({ startDate: -1, date: -1, createdAt: -1 }).lean();

  // Dynamically compute real-time status so multi-day workshops transition accurately as days progress
  const events = rawEvents.map((e) => {
    const sDate = e.startDate || e.date;
    const eDate = e.endDate || sDate;
    const computedStatus = computeEventStatus(sDate, eDate, e.status);
    return {
      ...e,
      startDate: sDate,
      endDate: eDate,
      date: sDate,
      status: computedStatus,
      sessionsCount: e.sessionsCount || 1,
    };
  });

  const totalRevenue = events.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
  const totalParticipants = events.reduce((sum, e) => sum + (e.totalParticipants || 0), 0);

  res.json({
    items: events,
    summary: {
      totalEvents: events.length,
      totalRevenue,
      totalParticipants,
    },
  });
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const { title, startDate, endDate, date, sessionsCount, location, description, status, tiers, notes } = req.body;
  if (!title?.trim()) throw ApiError.badRequest("Event title is required");

  const effectiveStart = startDate || date;
  if (!effectiveStart) throw ApiError.badRequest("Start date is required");
  const effectiveEnd = endDate || effectiveStart;

  const parsedTiers = Array.isArray(tiers)
    ? tiers.map((t: { tierName: string; pricePerParticipant: number; registeredCount: number }) => ({
        tierName: t.tierName?.trim() || "General",
        pricePerParticipant: Number(t.pricePerParticipant) || 0,
        registeredCount: Number(t.registeredCount) || 0,
      }))
    : [];

  const calculatedStatus = computeEventStatus(effectiveStart, effectiveEnd, status);

  const event = new IncomeEvent({
    title: title.trim(),
    startDate: new Date(effectiveStart),
    endDate: new Date(effectiveEnd),
    date: new Date(effectiveStart),
    sessionsCount: Math.max(1, Number(sessionsCount) || 1),
    location: location?.trim() || "",
    description: description?.trim() || "",
    status: calculatedStatus,
    tiers: parsedTiers,
    notes: notes?.trim() || "",
    createdBy: req.user?.sub ? new Types.ObjectId(req.user.sub) : undefined,
  });

  await event.save();
  res.status(201).json({ item: event });
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, startDate, endDate, date, sessionsCount, location, description, status, tiers, notes } = req.body;

  const event = await IncomeEvent.findById(id);
  if (!event) throw ApiError.notFound("Event not found");

  if (title !== undefined) event.title = title.trim();
  if (startDate !== undefined) {
    event.startDate = new Date(startDate);
    event.date = new Date(startDate);
  } else if (date !== undefined) {
    event.startDate = new Date(date);
    event.date = new Date(date);
  }
  if (endDate !== undefined) {
    event.endDate = new Date(endDate);
  } else if (event.startDate && !event.endDate) {
    event.endDate = event.startDate;
  }
  if (sessionsCount !== undefined) {
    event.sessionsCount = Math.max(1, Number(sessionsCount) || 1);
  }
  if (location !== undefined) event.location = location.trim();
  if (description !== undefined) event.description = description.trim();
  if (notes !== undefined) event.notes = notes.trim();

  const finalStart = event.startDate || event.date;
  const finalEnd = event.endDate || finalStart;
  event.status = computeEventStatus(finalStart, finalEnd, status || event.status);

  if (Array.isArray(tiers)) {
    event.tiers = tiers.map((t: { tierName: string; pricePerParticipant: number; registeredCount: number }) => ({
      tierName: t.tierName?.trim() || "General",
      pricePerParticipant: Number(t.pricePerParticipant) || 0,
      registeredCount: Number(t.registeredCount) || 0,
    })) as never;
  }

  await event.save();
  res.json({ item: event });
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const event = await IncomeEvent.findByIdAndDelete(id);
  if (!event) throw ApiError.notFound("Event not found");
  res.json({ message: "Event deleted successfully" });
});

// ==========================================
// 5. SPONSORS
// ==========================================

export const getSponsors = asyncHandler(async (_req: Request, res: Response) => {
  const sponsors = await IncomeSponsor.find().sort({ dateReceived: -1, createdAt: -1 }).lean();
  const totalReceived = sponsors
    .filter((s) => s.status === "RECEIVED")
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalPledged = sponsors
    .filter((s) => s.status === "PLEDGED")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  res.json({
    items: sponsors,
    summary: {
      totalSponsors: sponsors.length,
      totalReceived,
      totalPledged,
    },
  });
});

export const createSponsor = asyncHandler(async (req: Request, res: Response) => {
  const { sponsorName, tier, amount, status, dateReceived, contactPerson, contactEmail, contactPhone, deliverables, notes } = req.body;
  if (!sponsorName?.trim()) throw ApiError.badRequest("Sponsor name is required");
  if (typeof amount !== "number" || amount < 0) throw ApiError.badRequest("Valid amount is required");

  const sponsor = await IncomeSponsor.create({
    sponsorName: sponsorName.trim(),
    tier: tier || "SILVER",
    amount,
    status: status || "RECEIVED",
    dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
    contactPerson: contactPerson?.trim() || "",
    contactEmail: contactEmail?.trim() || "",
    contactPhone: contactPhone?.trim() || "",
    deliverables: deliverables?.trim() || "",
    notes: notes?.trim() || "",
    createdBy: req.user?.sub ? new Types.ObjectId(req.user.sub) : undefined,
  });

  res.status(201).json({ item: sponsor });
});

export const updateSponsor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const sponsor = await IncomeSponsor.findById(id);
  if (!sponsor) throw ApiError.notFound("Sponsor not found");

  const { sponsorName, tier, amount, status, dateReceived, contactPerson, contactEmail, contactPhone, deliverables, notes } = req.body;
  if (sponsorName !== undefined) sponsorName.trim() && (sponsor.sponsorName = sponsorName.trim());
  if (tier !== undefined) sponsor.tier = tier;
  if (amount !== undefined) {
    if (typeof amount !== "number" || amount < 0) throw ApiError.badRequest("Amount must be >= 0");
    sponsor.amount = amount;
  }
  if (status !== undefined) sponsor.status = status;
  if (dateReceived !== undefined) sponsor.dateReceived = new Date(dateReceived);
  if (contactPerson !== undefined) sponsor.contactPerson = contactPerson.trim();
  if (contactEmail !== undefined) sponsor.contactEmail = contactEmail.trim();
  if (contactPhone !== undefined) sponsor.contactPhone = contactPhone.trim();
  if (deliverables !== undefined) sponsor.deliverables = deliverables.trim();
  if (notes !== undefined) sponsor.notes = notes.trim();

  await sponsor.save();
  res.json({ item: sponsor });
});

export const deleteSponsor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const sponsor = await IncomeSponsor.findByIdAndDelete(id);
  if (!sponsor) throw ApiError.notFound("Sponsor not found");
  res.json({ message: "Sponsor deleted successfully" });
});

// ==========================================
// 6. MISCELLANEOUS INCOME
// ==========================================

export const getMisc = asyncHandler(async (_req: Request, res: Response) => {
  const misc = await IncomeMisc.find().sort({ dateReceived: -1, createdAt: -1 }).lean();
  const totalAmount = misc.reduce((sum, m) => sum + (m.amount || 0), 0);

  res.json({
    items: misc,
    summary: {
      totalCount: misc.length,
      totalAmount,
    },
  });
});

export const createMisc = asyncHandler(async (req: Request, res: Response) => {
  const { title, category, amount, dateReceived, receivedBy, paymentMode, notes } = req.body;
  if (!title?.trim()) throw ApiError.badRequest("Title is required");
  if (typeof amount !== "number" || amount <= 0) throw ApiError.badRequest("Amount must be > 0");

  const misc = await IncomeMisc.create({
    title: title.trim(),
    category: category || "OTHER",
    amount,
    dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
    receivedBy: receivedBy?.trim() || "",
    paymentMode: paymentMode || "UPI",
    notes: notes?.trim() || "",
    createdBy: req.user?.sub ? new Types.ObjectId(req.user.sub) : undefined,
  });

  res.status(201).json({ item: misc });
});

export const updateMisc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const misc = await IncomeMisc.findById(id);
  if (!misc) throw ApiError.notFound("Misc income entry not found");

  const { title, category, amount, dateReceived, receivedBy, paymentMode, notes } = req.body;
  if (title !== undefined) misc.title = title.trim();
  if (category !== undefined) misc.category = category;
  if (amount !== undefined) {
    if (typeof amount !== "number" || amount <= 0) throw ApiError.badRequest("Amount must be > 0");
    misc.amount = amount;
  }
  if (dateReceived !== undefined) misc.dateReceived = new Date(dateReceived);
  if (receivedBy !== undefined) misc.receivedBy = receivedBy.trim();
  if (paymentMode !== undefined) misc.paymentMode = paymentMode;
  if (notes !== undefined) misc.notes = notes.trim();

  await misc.save();
  res.json({ item: misc });
});

export const deleteMisc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const misc = await IncomeMisc.findByIdAndDelete(id);
  if (!misc) throw ApiError.notFound("Misc income entry not found");
  res.json({ message: "Misc entry deleted successfully" });
});
