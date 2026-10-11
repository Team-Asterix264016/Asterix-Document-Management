import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { InventoryItem, type InventoryStatus } from "../models/InventoryItem.js";
import { ToBuyItem } from "../models/ToBuyItem.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

export const listInventory = asyncHandler(async (req: Request, res: Response) => {
  const {
    q,
    status,
    category,
    assignedTo,
    isMissing,
    page = "1",
    limit = "25",
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};

  if (status && status !== "ALL") {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (assignedTo === "ALL") {
    filter.assignedToAll = true;
  } else if (assignedTo === "INDIVIDUAL") {
    filter.assignedToAll = false;
    filter.assignedTo = { $ne: null };
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (isMissing === "true") {
    filter["missingDetails.isMissing"] = true;
  } else if (isMissing === "false") {
    filter["missingDetails.isMissing"] = { $ne: true };
  }

  if (q && typeof q === "string" && q.trim()) {
    const trimmed = q.trim();
    const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { name: regex },
      { partNumber: regex },
      { location: regex },
      { category: regex },
      { description: regex },
    ];
  }

  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .populate("assignedTo", "displayName username")
      .populate("missingDetails.reportedBy", "displayName username")
      .populate("missingDetails.lastKnownHolder", "displayName username")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    InventoryItem.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum) || 1,
  });
});

export const getInventoryStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalCount, assignedAllCount, assignedIndividualCount, missingCount, installedCount, toBuyPending] =
    await Promise.all([
      InventoryItem.countDocuments(),
      InventoryItem.countDocuments({ assignedToAll: true }),
      InventoryItem.countDocuments({ assignedToAll: false, assignedTo: { $ne: null } }),
      InventoryItem.countDocuments({ $or: [{ status: "MISSING" }, { "missingDetails.isMissing": true }] }),
      InventoryItem.countDocuments({ status: "INSTALLED" }),
      ToBuyItem.countDocuments({ status: "PENDING" }),
    ]);

  res.json({
    stats: {
      total: totalCount,
      assignedAll: assignedAllCount,
      assignedIndividual: assignedIndividualCount,
      missing: missingCount,
      installed: installedCount,
      toBuyPending,
    },
  });
});

export const getInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await InventoryItem.findById(req.params.id)
    .populate("assignedTo", "displayName username")
    .populate("createdByUser", "displayName username")
    .populate("history.user", "displayName username")
    .populate("history.performedBy", "displayName username")
    .populate("missingDetails.reportedBy", "displayName username")
    .populate("missingDetails.lastKnownHolder", "displayName username");

  if (!item) {
    throw ApiError.notFound("Inventory component not found");
  }

  res.json({ item });
});

export const createInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    partNumber,
    category,
    description,
    quantity = 1,
    unit = "pcs",
    location = "Main Workshop",
    assignedTo,
    assignedToAll,
  } = req.body;

  if (!name || !name.trim()) {
    throw ApiError.badRequest("Component name is required");
  }

  const userId = req.user?.sub;
  const isAll = assignedTo === "ALL" || assignedToAll === true || (!assignedTo && assignedToAll !== false);
  const targetUser = isAll ? null : (assignedTo || null);

  const item = new InventoryItem({
    name: name.trim(),
    partNumber: (partNumber || "").trim(),
    category: (category || "General").trim(),
    description: (description || "").trim(),
    quantity: Math.max(0, Number(quantity) || 1),
    unit: (unit || "pcs").trim(),
    location: (location || "Main Workshop").trim(),
    status: "AVAILABLE",
    assignedToAll: isAll,
    assignedTo: targetUser,
    assignedAt: isAll ? null : new Date(),
    createdByUser: userId || null,
    history: [
      {
        action: "CREATED",
        user: targetUser,
        performedBy: userId,
        timestamp: new Date(),
        location: (location || "Main Workshop").trim(),
        notes: isAll
          ? "Initial registration (Assigned to All Members)"
          : "Initial registration (Assigned to team member)",
      },
    ],
  });

  await item.save();
  const populated = await item.populate(["assignedTo"]);
  res.status(201).json({ item: populated });
});

export const updateInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    partNumber,
    category,
    description,
    quantity,
    unit,
    location,
    status,
    assignedTo,
    assignedToAll,
  } = req.body;

  const item = await InventoryItem.findById(id);
  if (!item) {
    throw ApiError.notFound("Component not found");
  }

  const userId = req.user?.sub;
  const oldLocation = item.location;

  if (name !== undefined) item.name = name.trim();
  if (partNumber !== undefined) item.partNumber = partNumber.trim();
  if (category !== undefined) item.category = category.trim();
  if (description !== undefined) item.description = description;
  if (quantity !== undefined) item.quantity = Math.max(0, Number(quantity));
  if (unit !== undefined) item.unit = unit.trim();
  if (status !== undefined) item.status = status as InventoryStatus;

  // Handle assignment changes directly
  if (assignedTo !== undefined || assignedToAll !== undefined) {
    const isAll = assignedTo === "ALL" || assignedToAll === true || (assignedTo === "" && assignedToAll !== false);
    const targetUser = isAll ? null : (assignedTo || null);
    const changed = item.assignedToAll !== isAll || String(item.assignedTo || "") !== String(targetUser || "");

    if (changed) {
      item.assignedToAll = isAll;
      item.assignedTo = targetUser as any;
      item.assignedAt = isAll ? null : new Date();

      item.history.push({
        action: "UPDATED",
        user: targetUser,
        performedBy: userId as any,
        timestamp: new Date(),
        location: item.location,
        notes: isAll ? "Reassigned to All Members (Shared)" : "Custody assigned to team member",
      });
    }
  }

  if (location !== undefined && location.trim() && location.trim() !== oldLocation) {
    item.location = location.trim();
    item.history.push({
      action: "RELOCATED",
      performedBy: userId as any,
      timestamp: new Date(),
      location: item.location,
      notes: `Relocated from "${oldLocation}" to "${item.location}"`,
    });
  }

  await item.save();
  const populated = await item.populate(["assignedTo"]);
  res.json({ item: populated });
});

export const updateCustody = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, assignedTo, location, expectedReturnDate, notes } = req.body;

  const item = await InventoryItem.findById(id);
  if (!item) {
    throw ApiError.notFound("Component not found");
  }

  const userId = req.user?.sub;

  if (action === "CHECKOUT") {
    if (!assignedTo) {
      throw ApiError.badRequest("Target user (assignedTo) is required for checkout");
    }
    item.status = "CHECKED_OUT";
    item.assignedTo = assignedTo;
    item.assignedAt = new Date();
    item.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : null;
    if (location && location.trim()) {
      item.location = location.trim();
    }
    // If it was missing, clear missing flag
    if (item.missingDetails?.isMissing) {
      item.missingDetails.isMissing = false;
    }

    item.history.push({
      action: "CHECKOUT",
      user: assignedTo,
      performedBy: userId as any,
      timestamp: new Date(),
      location: item.location,
      notes: notes || "Component checked out",
    });
  } else if (action === "CHECKIN") {
    const previousHolder = item.assignedTo;
    item.status = "AVAILABLE";
    item.assignedTo = null;
    item.assignedAt = null;
    item.expectedReturnDate = null;
    if (location && location.trim()) {
      item.location = location.trim();
    }

    item.history.push({
      action: "CHECKIN",
      user: previousHolder,
      performedBy: userId as any,
      timestamp: new Date(),
      location: item.location,
      notes: notes || "Component checked back in to storage",
    });
  } else if (action === "TRANSFER") {
    if (!assignedTo) {
      throw ApiError.badRequest("New holder (assignedTo) is required for transfer");
    }
    item.status = "CHECKED_OUT";
    item.assignedTo = assignedTo;
    item.assignedAt = new Date();
    if (expectedReturnDate) {
      item.expectedReturnDate = new Date(expectedReturnDate);
    }
    if (location && location.trim()) {
      item.location = location.trim();
    }

    item.history.push({
      action: "TRANSFER",
      user: assignedTo,
      performedBy: userId as any,
      timestamp: new Date(),
      location: item.location,
      notes: notes || "Custody transferred",
    });
  } else {
    throw ApiError.badRequest("Invalid custody action. Allowed: CHECKOUT, CHECKIN, TRANSFER");
  }

  await item.save();
  const populated = await item.populate([
    "assignedTo",
    "history.user",
    "history.performedBy",
  ]);
  res.json({ item: populated });
});

export const toggleMissing = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isMissing, notes, lastKnownLocation } = req.body;

  const item = await InventoryItem.findById(id);
  if (!item) {
    throw ApiError.notFound("Component not found");
  }

  const userId = req.user?.sub;

  if (isMissing) {
    const priorHolder = item.assignedTo;
    item.status = "MISSING";
    item.missingDetails = {
      isMissing: true,
      reportedBy: userId as any,
      reportedAt: new Date(),
      lastKnownLocation: lastKnownLocation || item.location,
      lastKnownHolder: priorHolder,
      notes: notes || "",
    };

    item.history.push({
      action: "MARKED_MISSING",
      user: priorHolder,
      performedBy: userId as any,
      timestamp: new Date(),
      location: item.location,
      notes: notes ? `Marked MISSING: ${notes}` : "Marked as MISSING",
    });
  } else {
    // Marked as found / recovered
    item.status = item.assignedTo ? "CHECKED_OUT" : "AVAILABLE";
    item.missingDetails = {
      isMissing: false,
      reportedBy: null,
      reportedAt: null,
      lastKnownLocation: "",
      lastKnownHolder: null,
      notes: notes ? `Found: ${notes}` : "Item found and restored",
    };
    if (lastKnownLocation && lastKnownLocation.trim()) {
      item.location = lastKnownLocation.trim();
    }

    item.history.push({
      action: "MARKED_FOUND",
      user: item.assignedTo,
      performedBy: userId as any,
      timestamp: new Date(),
      location: item.location,
      notes: notes || "Component recovered and marked found",
    });
  }

  await item.save();
  const populated = await item.populate([
    "assignedTo",
    "missingDetails.reportedBy",
    "missingDetails.lastKnownHolder",
  ]);
  res.json({ item: populated });
});

export const deleteInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await InventoryItem.findByIdAndDelete(req.params.id);
  if (!item) {
    throw ApiError.notFound("Component not found");
  }
  res.json({ message: "Component deleted successfully" });
});

export const getTeamMembers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find({ active: true })
    .select("_id displayName username role")
    .sort({ displayName: 1 })
    .lean();
  res.json({ users });
});

