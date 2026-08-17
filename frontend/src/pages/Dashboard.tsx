import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { listBills } from "../api/bills";
import { getSummary, getCategories, getMonthly } from "../api/analytics";
import { SummaryCard } from "../components/ui/SummaryCard";
import { BillList } from "../components/bills/BillList";
import { SkeletonBillRows, SkeletonChart, SkeletonSummaryCards } from "../components/ui/Skeleton";
import { formatINR } from "../utils/format";
import { truncateTick } from "../utils/chart";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function Dashboard() {
  const { user } = useAuth();
  const isTreasurer = user?.role === "TREASURER";

  const summary = useAsync(() => getSummary(), []);
  const categories = useAsync(() => getCategories(), []);
  const monthly = useAsync(() => getMonthly(), []);
  const pending = useAsync(() => listBills({ status: "PENDING_APPROVAL", limit: 5, sort: "-submittedAt" }), []);
  const recent = useAsync(() => listBills({ limit: 6 }), [isTreasurer]);

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
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Add Bill
          </Link>
        )}
      </div>

      {summary.loading ? (
        <SkeletonSummaryCards />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Approved expenditure" value={summary.data ? formatINR(summary.data.approvedExpenditure) : "—"} />
          <SummaryCard label="Pending bills" value={summary.data ? String(summary.data.pendingCount) : "—"} tone="warn" />
          <SummaryCard label="Total bills" value={summary.data ? String(summary.data.totalBills) : "—"} />
          <SummaryCard label="Average bill" value={summary.data ? formatINR(summary.data.averageApprovedBillValue) : "—"} />
        </div>
      )}

      {isTreasurer && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Pending Approval</h2>
            <Link to="/approval" className="text-sm font-medium text-accent transition-colors hover:text-accent-hover">
              Review all →
            </Link>
          </div>
          {pending.loading ? <SkeletonBillRows count={3} /> : (
            <BillList bills={pending.data?.items ?? []} emptyTitle="No pending bills" emptySubtitle="You're all caught up." />
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Spending Trend</h2>
          <div className="card p-4">
            {monthly.loading ? (
              <SkeletonChart />
            ) : (monthly.data ?? []).length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-ink-500">No approved spending yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthly.data ?? []} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2F5D50" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#2F5D50" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#7A7468" }} tickLine={false} axisLine={{ stroke: "#E7E2D8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#7A7468" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatINR(v)} width={64} />
                  <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ borderRadius: 8, borderColor: "#E7E2D8", fontSize: 13 }} />
                  <Area type="monotone" dataKey="total" stroke="#2F5D50" strokeWidth={2} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Spending by Subsystem</h2>
          <div className="card p-4">
            {categories.loading ? (
              <SkeletonChart />
            ) : (categories.data ?? []).length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-ink-500">No approved spending yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categories.data ?? []} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" vertical={false} />
                  <XAxis
                    dataKey="subsystem"
                    tick={{ fontSize: 11, fill: "#7A7468" }}
                    tickLine={false}
                    axisLine={{ stroke: "#E7E2D8" }}
                    tickFormatter={truncateTick}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#7A7468" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatINR(v)} width={64} />
                  <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ borderRadius: 8, borderColor: "#E7E2D8", fontSize: 13 }} />
                  <Bar dataKey="total" fill="#2F5D50" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Recent Bills</h2>
          <Link to="/bills" className="text-sm font-medium text-accent transition-colors hover:text-accent-hover">
            View all →
          </Link>
        </div>
        {recent.loading ? <SkeletonBillRows /> : <BillList bills={recent.data?.items ?? []} />}
      </section>
    </div>
  );
}
