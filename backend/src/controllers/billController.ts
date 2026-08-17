import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import * as billService from "../services/billService.js";

export const createDraft = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.createDraftBill(req.user!.sub, req.body);
  res.status(201).json({ bill });
});

export const listBills = asyncHandler(async (req: Request, res: Response) => {
  const result = await billService.listBills(req.query as never, { userId: req.user!.sub, role: req.user!.role });
  res.json(result);
});

export const getBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.getBillOrThrow(req.params.id);
  billService.assertCanViewBill(bill, { userId: req.user!.sub, role: req.user!.role });
  await bill.populate([{ path: "subsystem", select: "name" }, { path: "uploadedBy", select: "displayName username" }]);
  res.json({ bill });
});

export const updateBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.getBillOrThrow(req.params.id);
  billService.assertCanViewBill(bill, { userId: req.user!.sub, role: req.user!.role });
  if (String(bill.uploadedBy) !== req.user!.sub) throw ApiError.forbidden("You can only edit your own bills");
  const updated = await billService.updateBill(req.params.id, req.body);
  res.json({ bill: updated });
});

export const uploadAttachments = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.getBillOrThrow(req.params.id);
  if (String(bill.uploadedBy) !== req.user!.sub) throw ApiError.forbidden("You can only edit your own bills");

  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) throw ApiError.badRequest("No files uploaded");

  const updated = await billService.attachFilesAndProcess(
    req.params.id,
    files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype, originalname: f.originalname }))
  );
  res.status(202).json({ bill: updated });
});

export const submitBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.getBillOrThrow(req.params.id);
  if (String(bill.uploadedBy) !== req.user!.sub) throw ApiError.forbidden("You can only submit your own bills");
  const updated = await billService.submitBill(req.params.id, req.body.subsystemId);
  res.json({ bill: updated });
});

export const approveBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.approveBill(req.params.id, req.user!.sub);
  res.json({ bill });
});

export const rejectBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.rejectBill(req.params.id, req.user!.sub, req.body.reason);
  res.json({ bill });
});
