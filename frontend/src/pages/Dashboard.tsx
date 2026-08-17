import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { listBills } from "../api/bills";
import { getSummary, getCategories } from "../api/analytics";
import { SummaryCard } from "../components/ui/SummaryCard";
import { BillList } from "../components/bills/BillList";
import { Spinner } from "../components/ui/Spinner";
import { formatINR } from "../utils/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function Dashboard() {
  const { user } = useAuth();
  const isTreasurer = user?.role === "TREASURER";

  const summary = useAsync(() => getSummary(), []);
  const categories = useAsync(() => getCategories(), []);
  const pending = useAsync(() => listBills({ status: "PENDING_APPROVAL", limit: 5, sort: "-submittedAt" }), []);
  const recent = useAsync(
    () => listBills(isTreasurer ? { limit: 6 } : { limit: 6 }),
    [isTreasurer]
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Asterix A-BAJA 2027</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">
            {greeting}, {user?.displayName?.split(" ")[0]}
          </h1>
        </div>
        {!isTreasurer && (
          <Link to="/bills/new" className="btn-primary">
            + Add Bill
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Approved expenditure" value={summary.data ? formatINR(summary.data.approvedExpenditure) : "…"} />
        <SummaryCard label="Pending bills" value={summary.data ? String(summary.data.pendingCount) : "…"} tone="warn" />
        <SummaryCard label="Total bills" value={summary.data ? String(summary.data.totalBills) : "…"} />
        <SummaryCard label="Average bill" value={summary.data ? formatINR(summary.data.averageApprovedBillValue) : "…"} />
      </div>

      {isTreasurer && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Pending Approval</h2>
            <Link to="/approval" className="text-sm font-medium text-accent hover:text-accent-hover">
              Review all →
            </Link>
          </div>
          {pending.loading ? (
            <Spinner />
          ) : (
            <BillList bills={pending.data?.items ?? []} emptyTitle="No pending bills" emptySubtitle="You're all caught up." />
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Spending Overview</h2>
        <div className="card p-4">
          {categories.loading || !categories.data ? (
            <div className="flex h-56 items-center justify-center">
              <Spinner />
            </div>
          ) : categories.data.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-ink-500">No approved spending yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categories.data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" vertical={false} />
                <XAxis dataKey="subsystem" tick={{ fontSize: 12, fill: "#7A7468" }} tickLine={false} axisLine={{ stroke: "#E7E2D8" }} />
                <YAxis tick={{ fontSize: 12, fill: "#7A7468" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatINR(v)} width={70} />
                <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ borderRadius: 8, borderColor: "#E7E2D8", fontSize: 13 }} />
                <Bar dataKey="total" fill="#2F5D50" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Recent Bills</h2>
          <Link to="/bills" className="text-sm font-medium text-accent hover:text-accent-hover">
            View all →
          </Link>
        </div>
        {recent.loading ? <Spinner /> : <BillList bills={recent.data?.items ?? []} />}
      </section>
    </div>
  );
}
