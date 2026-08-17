import { useAsync } from "../hooks/useAsync";
import { listBills } from "../api/bills";
import { BillList } from "../components/bills/BillList";
import { Spinner } from "../components/ui/Spinner";

export function Approval() {
  const { data, loading, reload } = useAsync(() => listBills({ status: "PENDING_APPROVAL", limit: 50, sort: "submittedAt" }), []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Pending Approval</h1>
        <button className="text-sm font-medium text-accent hover:text-accent-hover" onClick={reload}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <BillList bills={data?.items ?? []} emptyTitle="No pending bills" emptySubtitle="You're all caught up." />
      )}
    </div>
  );
}
