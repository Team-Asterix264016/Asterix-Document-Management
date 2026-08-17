import { api, downloadFile } from "./client";
import type { Report } from "../types";

export async function listSubsystemReports(): Promise<Report[]> {
  const res = await api.get<{ reports: Report[] }>("/reports/subsystems");
  return res.data.reports;
}

export async function listMonthlyReports(): Promise<Report[]> {
  const res = await api.get<{ reports: Report[] }>("/reports/monthly");
  return res.data.reports;
}

export function exportAllBills(): Promise<void> {
  return downloadFile("/exports/bills", "asterix-bills-export.xlsx");
}

export function exportSubsystem(id: string, name: string): Promise<void> {
  return downloadFile(`/exports/subsystem/${id}`, `${name}-report.xlsx`);
}

export function exportMonth(year: number, month: number): Promise<void> {
  return downloadFile(`/exports/month/${year}/${month}`, `${year}-${String(month).padStart(2, "0")}-report.xlsx`);
}
