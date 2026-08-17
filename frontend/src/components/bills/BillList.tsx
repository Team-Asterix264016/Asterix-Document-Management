import { Link } from "react-router-dom";
import type { Bill } from "../../types";
import { StatusBadge } from "../ui/StatusBadge";
import { formatDate, formatINR, nameOf, subsystemName } from "../../utils/format";
import { EmptyState } from "../ui/EmptyState";

export function BillList({ bills, emptyTitle = "No bills yet", emptySubtitle }: { bills: Bill[]; emptyTitle?: string; emptySubtitle?: string }) {
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
              <tr key={bill._id} className="border-b border-line last:border-0 hover:bg-canvas">
                <td className="px-4 py-3 text-ink-700">
                  <Link to={`/bills/${bill._id}`} className="block">
                    {formatDate(bill.billDate)}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-ink-900">
                  <Link to={`/bills/${bill._id}`} className="block">
                    {bill.vendor ?? "Untitled bill"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-700">{subsystemName(bill.subsystem)}</td>
                <td className="px-4 py-3 text-ink-700">{nameOf(bill.uploadedBy)}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-ink-900">{formatINR(bill.totalAmount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={bill.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 sm:hidden">
        {bills.map((bill) => (
          <Link key={bill._id} to={`/bills/${bill._id}`} className="card block p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{bill.vendor ?? "Untitled bill"}</p>
                <p className="text-xs text-ink-500">
                  {subsystemName(bill.subsystem)} · {formatDate(bill.billDate)}
                </p>
              </div>
              <p className="shrink-0 font-medium tabular-nums text-ink-900">{formatINR(bill.totalAmount)}</p>
            </div>
            <div className="mt-2.5">
              <StatusBadge status={bill.status} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
