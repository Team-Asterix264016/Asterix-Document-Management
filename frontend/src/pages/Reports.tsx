import { useState } from "react";
import { Download, FileSpreadsheet, ExternalLink, RefreshCw } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import {
  listSubsystemReports,
  listMonthlyReports,
  exportAllBills,
  exportSubsystem,
  exportMonth,
  regenerateReports,
} from "../api/reports";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonBillRows } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ui/Toast";
import { apiErrorMessage } from "../api/client";
import { formatDateTime, formatINR } from "../utils/format";
import type { Report } from "../types";

function ReportSection({
  title,
  reports,
  canExport,
  onDownload,
}: {
  title: string;
  reports: Report[];
  canExport: boolean;
  onDownload: (r: Report) => void;
}) {
  if (reports.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">{title}</h2>
        <EmptyState title="No reports generated yet" subtitle="Reports appear automatically once bills are approved." />
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-ink-900">{title}</h2>
      <div className="flex flex-col divide-y divide-line rounded border border-line">
        {reports.map((r) => (
          <div key={r._id} className="flex items-center gap-3 px-4 py-3">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-ink-300" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink-900">{r.label}</p>
              <p className="truncate text-xs text-ink-500">
                {formatINR(r.totals?.total)} · {r.totals?.count ?? 0} bills · generated {formatDateTime(r.generatedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {r.driveUrl && (
                <a
                  href={r.driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${r.label} in Drive`}
                  className="btn-secondary shrink-0 !px-3"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={2} />
                  <span className="hidden sm:inline">Open</span>
                </a>
              )}
              {canExport && (
                <button
                  type="button"
                  onClick={() => onDownload(r)}
                  aria-label={`Download ${r.label} Excel file`}
                  className="btn-secondary shrink-0 !px-3"
                  title="Download .xlsx directly"
                >
                  <Download className="h-4 w-4" strokeWidth={2} />
                  <span className="hidden sm:inline">{r.driveUrl ? "Download" : "Download .xlsx"}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Reports() {
  const { user } = useAuth();
  const toast = useToast();
  const subsystemReports = useAsync(() => listSubsystemReports(), []);
  const monthlyReports = useAsync(() => listMonthlyReports(), []);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const canExport = user?.role === "TREASURER" || user?.role === "ADMIN";

  async function handleExportAll() {
    try {
      await exportAllBills();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  async function handleDownload(r: Report) {
    try {
      if (r.type === "SUBSYSTEM") {
        await exportSubsystem(r.key, r.label);
      } else if (r.type === "MONTHLY") {
        const [year, month] = r.key.split("-").map(Number);
        await exportMonth(year, month);
      }
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    }
  }

  async function handleRegenerate() {
    try {
      setIsRegenerating(true);
      const res = await regenerateReports();
      toast.push(
        `Regenerated and synced ${res.regenerated.subsystems} subsystem reports & ${res.regenerated.months} monthly report to Google Drive.`,
        "success"
      );
      subsystemReports.reload();
      monthlyReports.reload();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-900">Reports</h1>
        {canExport && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} strokeWidth={2} />
              {isRegenerating ? "Syncing..." : "Sync / Regenerate All"}
            </button>
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={handleExportAll}>
              <Download className="h-4 w-4" strokeWidth={2} />
              Export all approved (.xlsx)
            </button>
          </div>
        )}
      </div>

      {subsystemReports.loading || monthlyReports.loading ? (
        <div className="flex flex-col gap-8">
          <SkeletonBillRows count={3} />
        </div>
      ) : (
        <>
          <ReportSection
            title="Subsystem Reports"
            reports={subsystemReports.data ?? []}
            canExport={canExport}
            onDownload={handleDownload}
          />
          <ReportSection
            title="Monthly Reports"
            reports={monthlyReports.data ?? []}
            canExport={canExport}
            onDownload={handleDownload}
          />
        </>
      )}
    </div>
  );
}
