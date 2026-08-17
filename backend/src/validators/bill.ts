import { z } from "zod";

const itemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  quantity: z.number().nonnegative().optional().default(1),
  unitPrice: z.number().nonnegative().optional().default(0),
  tax: z.number().nonnegative().optional().default(0),
  total: z.number().nonnegative().optional().default(0),
});

export const createDraftBillSchema = z.object({
  vendor: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  billDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const updateBillSchema = z.object({
  vendor: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  billDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  currency: z.string().min(1).optional(),
  subtotal: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  discount: z.number().nullable().optional(),
  additionalCharges: z.number().nullable().optional(),
  totalAmount: z.number().nullable().optional(),
  items: z.array(itemSchema).optional(),
  subsystemId: z.string().nullable().optional(),
  newSubsystemName: z.string().nullable().optional(),
});

export const submitBillSchema = z.object({
  subsystemId: z.string().min(1, "Subsystem is required"),
});

export const rejectBillSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").optional(),
});

export const billQuerySchema = z.object({
  status: z.string().optional(),
  subsystem: z.string().optional(),
  vendor: z.string().optional(),
  q: z.string().optional(),
  uploadedBy: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.string().optional(),
});
