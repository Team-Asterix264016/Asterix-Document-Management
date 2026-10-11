import { api } from "./client";
import type {
  TreasuryOverviewResponse,
  TreasuryConfig,
  InstallmentsMatrixResponse,
  InstallmentPlan,
  IncomeEvent,
  IncomeSponsor,
  IncomeMisc,
  PaymentMode,
  EventTier,
  EventStatus,
  SponsorTier,
  SponsorStatus,
  MiscCategory,
} from "../types/income";

// ==========================================
// 1. OVERVIEW & SETTINGS
// ==========================================

export async function getTreasuryOverview(): Promise<TreasuryOverviewResponse> {
  const res = await api.get<TreasuryOverviewResponse>("/income/overview");
  return res.data;
}

export async function getTreasurySettings(): Promise<{ config: TreasuryConfig }> {
  const res = await api.get<{ config: TreasuryConfig }>("/income/settings");
  return res.data;
}

export async function updateTreasurySettings(targetPerMember: number): Promise<{ config: TreasuryConfig }> {
  const res = await api.put<{ config: TreasuryConfig }>("/income/settings", { targetPerMember });
  return res.data;
}

// ==========================================
// 2. INSTALLMENTS
// ==========================================

export async function getInstallmentsMatrix(): Promise<InstallmentsMatrixResponse> {
  const res = await api.get<InstallmentsMatrixResponse>("/income/installments/matrix");
  return res.data;
}

export async function getInstallmentPlans(): Promise<{ items: InstallmentPlan[] }> {
  const res = await api.get<{ items: InstallmentPlan[] }>("/income/installments/plans");
  return res.data;
}

export async function createInstallmentPlan(data: {
  title: string;
  amount: number;
  dueDate: string;
  description?: string;
}): Promise<{ item: InstallmentPlan }> {
  const res = await api.post<{ item: InstallmentPlan }>("/income/installments/plans", data);
  return res.data;
}

export async function updateInstallmentPlan(
  id: string,
  data: Partial<InstallmentPlan>
): Promise<{ item: InstallmentPlan }> {
  const res = await api.put<{ item: InstallmentPlan }>(`/income/installments/plans/${id}`, data);
  return res.data;
}

export async function deleteInstallmentPlan(id: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/income/installments/plans/${id}`);
  return res.data;
}

export async function recordInstallmentPayment(data: {
  installmentId: string;
  memberId: string;
  amountPaid?: number;
  paidAt?: string;
  paymentMode?: PaymentMode;
  transactionRef?: string;
  notes?: string;
}): Promise<{ payment: unknown }> {
  const res = await api.post<{ payment: unknown }>("/income/installments/pay", data);
  return res.data;
}

export async function deleteInstallmentPayment(paymentId: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/income/installments/pay/${paymentId}`);
  return res.data;
}

// ==========================================
// 3. WORKSHOPS & EVENTS
// ==========================================

export async function getIncomeEvents(): Promise<{
  items: IncomeEvent[];
  summary: { totalEvents: number; totalRevenue: number; totalParticipants: number };
}> {
  const res = await api.get<{
    items: IncomeEvent[];
    summary: { totalEvents: number; totalRevenue: number; totalParticipants: number };
  }>("/income/events");
  return res.data;
}

export async function createIncomeEvent(data: {
  title: string;
  date: string;
  location?: string;
  description?: string;
  status?: EventStatus;
  tiers: EventTier[];
  notes?: string;
}): Promise<{ item: IncomeEvent }> {
  const res = await api.post<{ item: IncomeEvent }>("/income/events", data);
  return res.data;
}

export async function updateIncomeEvent(
  id: string,
  data: {
    title?: string;
    date?: string;
    location?: string;
    description?: string;
    status?: EventStatus;
    tiers?: EventTier[];
    notes?: string;
  }
): Promise<{ item: IncomeEvent }> {
  const res = await api.put<{ item: IncomeEvent }>(`/income/events/${id}`, data);
  return res.data;
}

export async function deleteIncomeEvent(id: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/income/events/${id}`);
  return res.data;
}

// ==========================================
// 4. SPONSORS
// ==========================================

export async function getIncomeSponsors(): Promise<{
  items: IncomeSponsor[];
  summary: { totalSponsors: number; totalReceived: number; totalPledged: number };
}> {
  const res = await api.get<{
    items: IncomeSponsor[];
    summary: { totalSponsors: number; totalReceived: number; totalPledged: number };
  }>("/income/sponsors");
  return res.data;
}

export async function createIncomeSponsor(data: {
  sponsorName: string;
  tier: SponsorTier;
  amount: number;
  status?: SponsorStatus;
  dateReceived?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  deliverables?: string;
  notes?: string;
}): Promise<{ item: IncomeSponsor }> {
  const res = await api.post<{ item: IncomeSponsor }>("/income/sponsors", data);
  return res.data;
}

export async function updateIncomeSponsor(
  id: string,
  data: Partial<IncomeSponsor>
): Promise<{ item: IncomeSponsor }> {
  const res = await api.put<{ item: IncomeSponsor }>(`/income/sponsors/${id}`, data);
  return res.data;
}

export async function deleteIncomeSponsor(id: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/income/sponsors/${id}`);
  return res.data;
}

// ==========================================
// 5. MISCELLANEOUS
// ==========================================

export async function getIncomeMisc(): Promise<{
  items: IncomeMisc[];
  summary: { totalCount: number; totalAmount: number };
}> {
  const res = await api.get<{
    items: IncomeMisc[];
    summary: { totalCount: number; totalAmount: number };
  }>("/income/misc");
  return res.data;
}

export async function createIncomeMisc(data: {
  title: string;
  category: MiscCategory;
  amount: number;
  dateReceived?: string;
  receivedBy?: string;
  paymentMode?: PaymentMode;
  notes?: string;
}): Promise<{ item: IncomeMisc }> {
  const res = await api.post<{ item: IncomeMisc }>("/income/misc", data);
  return res.data;
}

export async function updateIncomeMisc(
  id: string,
  data: Partial<IncomeMisc>
): Promise<{ item: IncomeMisc }> {
  const res = await api.put<{ item: IncomeMisc }>(`/income/misc/${id}`, data);
  return res.data;
}

export async function deleteIncomeMisc(id: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/income/misc/${id}`);
  return res.data;
}
