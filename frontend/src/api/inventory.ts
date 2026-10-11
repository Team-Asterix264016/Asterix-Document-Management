import { api } from "./client";
import type {
  InventoryItem,
  InventoryStats,
  CustodyAction,
  InventoryStatus,
} from "../types";

export interface InventoryFilters {
  q?: string;
  status?: InventoryStatus | "ALL" | string;
  category?: string;
  assignedTo?: string;
  isMissing?: boolean | string;
  page?: number;
  limit?: number;
}

export interface PaginatedInventory {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function listInventory(
  filters: InventoryFilters = {}
): Promise<PaginatedInventory> {
  const res = await api.get<PaginatedInventory>("/inventory", { params: filters });
  return res.data;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const res = await api.get<{ stats: InventoryStats }>("/inventory/stats");
  return res.data.stats;
}

export async function getInventoryItem(id: string): Promise<InventoryItem> {
  const res = await api.get<{ item: InventoryItem }>(`/inventory/${id}`);
  return res.data.item;
}

export async function createInventoryItem(
  data: Partial<InventoryItem> & { name: string }
): Promise<InventoryItem> {
  const res = await api.post<{ item: InventoryItem }>("/inventory", data);
  return res.data.item;
}

export async function updateInventoryItem(
  id: string,
  data: Partial<InventoryItem>
): Promise<InventoryItem> {
  const res = await api.put<{ item: InventoryItem }>(`/inventory/${id}`, data);
  return res.data.item;
}

export interface CustodyPayload {
  action: CustodyAction;
  assignedTo?: string;
  location?: string;
  expectedReturnDate?: string | null;
  notes?: string;
}

export async function updateCustody(
  id: string,
  payload: CustodyPayload
): Promise<InventoryItem> {
  const res = await api.patch<{ item: InventoryItem }>(`/inventory/${id}/custody`, payload);
  return res.data.item;
}

export interface MissingPayload {
  isMissing: boolean;
  notes?: string;
  lastKnownLocation?: string;
}

export async function toggleMissing(
  id: string,
  payload: MissingPayload
): Promise<InventoryItem> {
  const res = await api.patch<{ item: InventoryItem }>(`/inventory/${id}/missing`, payload);
  return res.data.item;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await api.delete(`/inventory/${id}`);
}

export interface TeamMember {
  _id: string;
  displayName: string;
  username: string;
  role: string;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await api.get<{ users: TeamMember[] }>("/inventory/team-members");
  return res.data.users;
}

