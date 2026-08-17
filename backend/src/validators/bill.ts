import { z } from "zod";

const dateString = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), { message: "Invalid date" });

const money = z.number().finite().nonnegative().max(100_000_000, "Amount is unrealistically large");

const itemSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(2000).optional().default(""),
  quantity: z.number().finite().nonnegative().max(1_000_000).optional().default(1),
  unitPrice: money.optional().default(0),
  tax: money.optional().default(0),
  total: money.optional().default(0),
});

export const createDraftBillSchema = z.object({
  vendor: z.string().max(200).nullable().optional(),
  invoiceNumber: z.string().max(100).nullable().optional(),
  billDate: dateString.nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
});

export const updateBillSchema = z.object({
  vendor: z.string().max(200).nullable().optional(),
  invoiceNumber: z.string().max(100).nullable().optional(),
  billDate: dateString.nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  currency: z.string().min(1).max(10).optional(),
  subtotal: money.nullable().optional(),
  tax: money.nullable().optional(),
  discount: money.nullable().optional(),
  additionalCharges: money.nullable().optional(),
  totalAmount: money.nullable().optional(),
  items: z.array(itemSchema).max(200).optional(),
  subsystemId: z.string().nullable().optional(),
  newSubsystemName: z.string().max(100).nullable().optional(),
});

export const submitBillSchema = z.object({
  subsystemId: z.string().min(1, "Subsystem is required"),
});

export const rejectBillSchema = z.object({
  reason: z.string().max(2000, "Rejection reason is too long").min(1, "Rejection reason is required").optional(),
});

export const billQuerySchema = z.object({
  status: z.string().optional(),
  subsystem: z.string().optional(),
  vendor: z.string().optional(),
  q: z.string().max(200).optional(),
  uploadedBy: z.string().optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.string().optional(),
});
