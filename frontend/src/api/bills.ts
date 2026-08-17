import { api } from "./client";
import type { Bill, PaginatedBills } from "../types";

export interface BillFilters {
  status?: string;
  subsystem?: string;
  vendor?: string;
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export async function listBills(filters: BillFilters = {}): Promise<PaginatedBills> {
  const res = await api.get<PaginatedBills>("/bills", { params: filters });
  return res.data;
}

export async function getBill(id: string): Promise<Bill> {
  const res = await api.get<{ bill: Bill }>(`/bills/${id}`);
  return res.data.bill;
}

export async function createDraftBill(data: Partial<Bill> = {}): Promise<Bill> {
  const res = await api.post<{ bill: Bill }>("/bills", data);
  return res.data.bill;
}

export async function updateBill(id: string, data: Record<string, unknown>): Promise<Bill> {
  const res = await api.put<{ bill: Bill }>(`/bills/${id}`, data);
  return res.data.bill;
}

export async function uploadAttachments(id: string, files: File[]): Promise<Bill> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const res = await api.post<{ bill: Bill }>(`/bills/${id}/attachments`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.bill;
}

export async function submitBill(id: string, subsystemId: string): Promise<Bill> {
  const res = await api.post<{ bill: Bill }>(`/bills/${id}/submit`, { subsystemId });
  return res.data.bill;
}

export async function approveBill(id: string): Promise<Bill> {
  const res = await api.post<{ bill: Bill }>(`/bills/${id}/approve`);
  return res.data.bill;
}

export async function rejectBill(id: string, reason?: string): Promise<Bill> {
  const res = await api.post<{ bill: Bill }>(`/bills/${id}/reject`, { reason });
  return res.data.bill;
}
