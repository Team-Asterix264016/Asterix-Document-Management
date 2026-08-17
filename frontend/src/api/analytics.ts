import { api } from "./client";
import type { AnalyticsSummary } from "../types";

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  subsystem?: string;
  vendor?: string;
  status?: string;
}

export async function getSummary(filters: AnalyticsFilters = {}): Promise<AnalyticsSummary> {
  const res = await api.get<AnalyticsSummary>("/analytics/summary", { params: filters });
  return res.data;
}

export async function getCategories(filters: AnalyticsFilters = {}) {
  const res = await api.get<{ items: Array<{ subsystem: string; total: number; count: number }> }>("/analytics/categories", { params: filters });
  return res.data.items;
}

export async function getMonthly(filters: AnalyticsFilters = {}) {
  const res = await api.get<{ items: Array<{ month: string; total: number; count: number }> }>("/analytics/monthly", { params: filters });
  return res.data.items;
}

export async function getVendors(filters: AnalyticsFilters = {}) {
  const res = await api.get<{ items: Array<{ vendor: string; total: number; count: number }> }>("/analytics/vendors", { params: filters });
  return res.data.items;
}

export async function getUsers(filters: AnalyticsFilters = {}) {
  const res = await api.get<{ items: Array<{ user: string; total: number; count: number }> }>("/analytics/users", { params: filters });
  return res.data.items;
}

export async function getApprovals(filters: AnalyticsFilters = {}) {
  const res = await api.get<{ pendingCount: number; approvedCount: number; rejectedCount: number; averageApprovalTurnaroundHours: number | null }>(
    "/analytics/approvals",
    { params: filters }
  );
  return res.data;
}
