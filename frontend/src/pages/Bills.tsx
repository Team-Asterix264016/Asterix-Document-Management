import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { listBills } from "../api/bills";
import { listSubsystems } from "../api/subsystems";
import { BillList } from "../components/bills/BillList";
import { SkeletonBillRows } from "../components/ui/Skeleton";
import type { BillStatus } from "../types";

const STATUS_OPTIONS: Array<{ value: BillStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export function Bills() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [subsystem, setSubsystem] = useState("");
  const [page, setPage] = useState(1);

  const subsystems = useAsync(() => listSubsystems(), []);
  const bills = useAsync(() => listBills({ q: q || undefined, status: status || undefined, subsystem: subsystem || undefined, page, limit: 20 }), [
    q,
    status,
    subsystem,
    page,
  ]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-ink-900">Bills</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" strokeWidth={2} />
          <input
            className="field-input pl-9"
            placeholder="Search vendor, invoice, description…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        <select
          className="field-input sm:max-w-[180px]"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="field-input sm:max-w-[180px]"
          value={subsystem}
          onChange={(e) => {
            setPage(1);
            setSubsystem(e.target.value);
          }}
        >
          <option value="">All subsystems</option>
          {subsystems.data?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {bills.loading ? (
        <SkeletonBillRows count={6} />
      ) : (
        <>
          <BillList bills={bills.data?.items ?? []} emptyTitle="No bills match your filters" />
          {bills.data && bills.data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <span className="text-sm text-ink-500">
                Page {bills.data.page} of {bills.data.pages}
              </span>
              <button className="btn-secondary" disabled={page >= bills.data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
