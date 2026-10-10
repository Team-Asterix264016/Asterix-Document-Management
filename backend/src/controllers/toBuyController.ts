import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ToBuyItem, type ToBuyPriority, type ToBuyStatus } from "../models/ToBuyItem.js";
import { ApiError } from "../utils/ApiError.js";

export const listToBuy = asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, subsystem, page = "1", limit = "50" } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};

  if (status && status !== "ALL") {
    filter.status = status;
  }
  if (priority && priority !== "ALL") {
    filter.priority = priority;
  }
  if (subsystem) {
    filter.subsystem = subsystem;
  }

  const [items, total] = await Promise.all([
    ToBuyItem.find(filter)
      .populate("subsystem", "name")
      .populate("requestedBy", "displayName username")
      .populate("approvedBy", "displayName username")
      .populate("sourceInventoryItem", "name partNumber location")
      .populate("linkedBillId", "invoiceNumber totalAmount status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ToBuyItem.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum) || 1,
  });
});

export const createToBuy = asyncHandler(async (req: Request, res: Response) => {
  const {
    itemName,
    subsystem,
    category,
    quantity = 1,
    unit = "pcs",
    estimatedCost = 0,
    priority = "MEDIUM",
    supplierUrl,
    suggestedVendor,
    notes,
    sourceInventoryItem,
  } = req.body;

  if (!itemName || !itemName.trim()) {
    throw ApiError.badRequest("Item name is required");
  }

  const userId = req.user?.sub;

  const toBuy = new ToBuyItem({
    itemName: itemName.trim(),
    subsystem: subsystem || null,
    category: (category || "General").trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    unit: (unit || "pcs").trim(),
    estimatedCost: Math.max(0, Number(estimatedCost) || 0),
    priority: (priority as ToBuyPriority) || "MEDIUM",
    status: "PENDING",
    supplierUrl: (supplierUrl || "").trim(),
    suggestedVendor: (suggestedVendor || "").trim(),
    notes: (notes || "").trim(),
    requestedBy: userId,
    sourceInventoryItem: sourceInventoryItem || null,
  });

  await toBuy.save();
  const populated = await toBuy.populate([
    "subsystem",
    "requestedBy",
    "sourceInventoryItem",
  ]);
  res.status(201).json({ item: populated });
});

export const updateToBuy = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    itemName,
    subsystem,
    category,
    quantity,
    unit,
    estimatedCost,
    priority,
    status,
    supplierUrl,
    suggestedVendor,
    notes,
    linkedBillId,
  } = req.body;

  const item = await ToBuyItem.findById(id);
  if (!item) {
    throw ApiError.notFound("To-buy item not found");
  }

  const userId = req.user?.sub;

  if (itemName !== undefined) item.itemName = itemName.trim();
  if (subsystem !== undefined) item.subsystem = subsystem || null;
  if (category !== undefined) item.category = category.trim();
  if (quantity !== undefined) item.quantity = Math.max(1, Number(quantity));
  if (unit !== undefined) item.unit = unit.trim();
  if (estimatedCost !== undefined) item.estimatedCost = Math.max(0, Number(estimatedCost));
  if (priority !== undefined) item.priority = priority as ToBuyPriority;
  if (supplierUrl !== undefined) item.supplierUrl = supplierUrl.trim();
  if (suggestedVendor !== undefined) item.suggestedVendor = suggestedVendor.trim();
  if (notes !== undefined) item.notes = notes;
  if (linkedBillId !== undefined) item.linkedBillId = linkedBillId || null;

  if (status !== undefined) {
    item.status = status as ToBuyStatus;
    if (status === "APPROVED" && !item.approvedBy) {
      item.approvedBy = userId as any;
    }
  }

  await item.save();
  const populated = await item.populate([
    "subsystem",
    "requestedBy",
    "approvedBy",
    "sourceInventoryItem",
    "linkedBillId",
  ]);
  res.json({ item: populated });
});

export const deleteToBuy = asyncHandler(async (req: Request, res: Response) => {
  const item = await ToBuyItem.findByIdAndDelete(req.params.id);
  if (!item) {
    throw ApiError.notFound("To-buy item not found");
  }
  res.json({ message: "To-buy item deleted successfully" });
});
