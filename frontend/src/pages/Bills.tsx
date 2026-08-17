import { useState } from "react";
import { useAsync } from "../hooks/useAsync";
import { listBills } from "../api/bills";
import { listSubsystems } from "../api/subsystems";
import { BillList } from "../components/bills/BillList";
import { Spinner } from "../components/ui/Spinner";
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
        <input
          className="field-input sm:max-w-xs"
          placeholder="Search vendor, invoice, description…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
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
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <>
          <BillList bills={bills.data?.items ?? []} emptyTitle="No bills match your filters" />
          {bills.data && bills.data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="text-sm text-ink-500">
                Page {bills.data.page} of {bills.data.pages}
              </span>
              <button className="btn-secondary" disabled={page >= bills.data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
