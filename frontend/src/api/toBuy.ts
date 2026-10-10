import { api } from "./client";
import type { ToBuyItem, ToBuyPriority, ToBuyStatus } from "../types";

export interface ToBuyFilters {
  status?: ToBuyStatus | "ALL" | string;
  priority?: ToBuyPriority | "ALL" | string;
  subsystem?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedToBuy {
  items: ToBuyItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function listToBuy(filters: ToBuyFilters = {}): Promise<PaginatedToBuy> {
  const res = await api.get<PaginatedToBuy>("/to-buy", { params: filters });
  return res.data;
}

export async function createToBuy(
  data: Partial<ToBuyItem> & { itemName: string }
): Promise<ToBuyItem> {
  const res = await api.post<{ item: ToBuyItem }>("/to-buy", data);
  return res.data.item;
}

export async function updateToBuy(
  id: string,
  data: Partial<ToBuyItem>
): Promise<ToBuyItem> {
  const res = await api.patch<{ item: ToBuyItem }>(`/to-buy/${id}`, data);
  return res.data.item;
}

export async function deleteToBuy(id: string): Promise<void> {
  await api.delete(`/to-buy/${id}`);
}
