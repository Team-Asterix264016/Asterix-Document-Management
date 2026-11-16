import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Bill } from "../../types";
import { StatusBadge } from "../ui/StatusBadge";
import { formatDate, formatINR, nameOf, subsystemName } from "../../utils/format";
import { EmptyState } from "../ui/EmptyState";

export function BillList({ bills, emptyTitle = "No bills yet", emptySubtitle }: { bills: Bill[]; emptyTitle?: string; emptySubtitle?: string }) {
  const navigate = useNavigate();

  if (bills.length === 0) {
    return <EmptyState title={emptyTitle} subtitle={emptySubtitle} />;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded border border-line sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Vendor</th>
              <th className="px-4 py-2.5">Subsystem</th>
              <th className="px-4 py-2.5">Submitted By</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr
                key={bill._id}
                onClick={() => navigate(`/bills/${bill._id}`)}
                className="group cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-canvas"
              >
                <td className="px-4 py-3 text-ink-700">
                  <Link to={`/bills/${bill._id}`} className="block outline-none" onClick={(e) => e.stopPropagation()}>
                    {formatDate(bill.billDate || bill.createdAt)}
                  </Link>
                </td>
                <td className="max-w-[220px] px-4 py-3 font-medium text-ink-900">
                  <Link to={`/bills/${bill._id}`} className="block truncate outline-none" onClick={(e) => e.stopPropagation()}>
                    {bill.vendor ?? "Untitled bill"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-700">{subsystemName(bill.subsystem)}</td>
                <td className="px-4 py-3 text-ink-700">{nameOf(bill.uploadedBy)}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-ink-900">{formatINR(bill.totalAmount)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={bill.status} />
                    <ChevronRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" strokeWidth={2} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        {bills.map((bill, i) => (
          <Link
            key={bill._id}
            to={`/bills/${bill._id}`}
            style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
            className="card-interactive animate-fade-up flex items-center gap-3 p-3.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-medium text-ink-900">{bill.vendor ?? "Untitled bill"}</p>
                <p className="shrink-0 font-medium tabular-nums text-ink-900">{formatINR(bill.totalAmount)}</p>
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {subsystemName(bill.subsystem)} · {formatDate(bill.billDate || bill.createdAt)}
              </p>
              <div className="mt-2.5">
                <StatusBadge status={bill.status} />
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" strokeWidth={2} />
          </Link>
        ))}
      </div>
    </>
  );
}
