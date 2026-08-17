import type { BillStatus } from "../../types";

const STATUS_CONFIG: Record<BillStatus, { label: string; bg: string; fg: string; dot: string }> = {
  DRAFT: { label: "Draft", bg: "bg-ink-300/20", fg: "text-ink-700", dot: "bg-ink-500" },
  PROCESSING: { label: "Processing", bg: "bg-status-processingSoft", fg: "text-status-processing", dot: "bg-status-processing" },
  PENDING_APPROVAL: { label: "Pending Approval", bg: "bg-status-pendingSoft", fg: "text-status-pending", dot: "bg-status-pending" },
  APPROVED: { label: "Approved", bg: "bg-status-approvedSoft", fg: "text-status-approved", dot: "bg-status-approved" },
  REJECTED: { label: "Rejected", bg: "bg-status-rejectedSoft", fg: "text-status-rejected", dot: "bg-status-rejected" },
};

export function StatusBadge({ status }: { status: BillStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`badge ${config.bg} ${config.fg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} ${status === "PROCESSING" ? "animate-pulse" : ""}`} aria-hidden />
      {config.label}
    </span>
  );
}
