import { RefreshCw } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { listBills } from "../api/bills";
import { BillList } from "../components/bills/BillList";
import { SkeletonBillRows } from "../components/ui/Skeleton";

export function Approval() {
  const { data, loading, reload } = useAsync(() => listBills({ status: "PENDING_APPROVAL", limit: 50, sort: "submittedAt" }), []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Pending Approval</h1>
          {!loading && data && <p className="mt-0.5 text-sm text-ink-500">{data.total} bill{data.total === 1 ? "" : "s"} awaiting your decision</p>}
        </div>
        <button className="btn-ghost" onClick={reload}>
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          Refresh
        </button>
      </div>

      {loading ? <SkeletonBillRows count={5} /> : <BillList bills={data?.items ?? []} emptyTitle="No pending bills" emptySubtitle="You're all caught up." />}
    </div>
  );
}
