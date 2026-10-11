import { Link } from "react-router-dom";
import { Plus, ArrowRight, TrendingUp, Receipt, Wallet, CalendarCheck, GraduationCap, Award, WalletCards } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { listBills } from "../api/bills";
import { getSummary, getCategories, getMonthly } from "../api/analytics";
import { getTreasuryOverview } from "../api/income";
import { SummaryCard } from "../components/ui/SummaryCard";
import { BillList } from "../components/bills/BillList";
import { SkeletonBillRows, SkeletonChart, SkeletonSummaryCards } from "../components/ui/Skeleton";
import { formatINR } from "../utils/format";
import { truncateTick } from "../utils/chart";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function Dashboard() {
  const { user } = useAuth();
  const isTreasurer = user?.role === "TREASURER";
  const isAdmin = user?.role === "ADMIN";
  const isPrivileged = isTreasurer || isAdmin;

  const summary = useAsync(() => getSummary(), []);
  const categories = useAsync(() => getCategories(), []);
  const monthly = useAsync(() => getMonthly(), []);
  const treasury = useAsync(
    () => (isPrivileged ? getTreasuryOverview() : Promise.resolve(null)),
    [isPrivileged]
  );
  const pending = useAsync(
    () =>
      isTreasurer
        ? listBills({ status: "PENDING_APPROVAL", limit: 5, sort: "-submittedAt" })
        : Promise.resolve({ items: [], total: 0, page: 1, limit: 5, pages: 1 }),
    [isTreasurer]
  );
  const recent = useAsync(() => listBills({ limit: 6 }), [isTreasurer]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const totalInflow = treasury.data?.inflow?.total ?? 0;
  const approvedExpenditure = summary.data?.approvedExpenditure ?? 0;
  const netBalance = totalInflow - approvedExpenditure;

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Asterix A-BAJA '27
            </span>
            {isPrivileged && (
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-status-approved">
                Financial Command Center
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">
            {greeting}, {user?.displayName?.split(" ")[0]}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {isPrivileged && (
            <Link to="/income" className="btn-secondary text-xs">
              <Wallet className="h-3.5 w-3.5 text-accent" />
              Manage Income
            </Link>
          )}
          {!isTreasurer && (
            <Link to="/bills/new" className="btn-primary text-xs">
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              Add Bill
            </Link>
          )}
        </div>
      </div>

      {/* Top Financial Summary Cards */}
      {summary.loading || (isPrivileged && treasury.loading) ? (
        <SkeletonSummaryCards />
      ) : isPrivileged ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Net Treasury Balance */}
          <div className="card relative overflow-hidden p-4 border-accent/20 bg-gradient-to-br from-surface to-accent-soft/20">
            <span className="text-xs font-semibold text-ink-600">Net Treasury Balance</span>
            <p className={`mt-1.5 text-2xl font-extrabold ${netBalance >= 0 ? "text-status-approved" : "text-status-rejected"}`}>
              {formatINR(netBalance)}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              Total Inflow minus Outflow
            </p>
          </div>

          {/* Total Inflow */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-500">Total Inflow (Income)</span>
              <TrendingUp className="h-4 w-4 text-status-approved" />
            </div>
            <p className="mt-1.5 text-2xl font-extrabold text-ink-900">
              {formatINR(totalInflow)}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">Across all 4 income avenues</p>
          </div>

          {/* Approved Outflow */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-500">Approved Expenditure</span>
              <Receipt className="h-4 w-4 text-ink-400" />
            </div>
            <p className="mt-1.5 text-2xl font-extrabold text-ink-900">
              {summary.data ? formatINR(summary.data.approvedExpenditure) : "—"}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              {summary.data?.approvedCount ?? 0} approved bills
            </p>
          </div>

          {/* Pending Bills */}
          <SummaryCard
            label="Pending bills"
            value={summary.data ? String(summary.data.pendingCount) : "—"}
            tone="warn"
          />
        </div>
      ) : (
        /* Member Dashboard Cards */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Approved expenditure" value={summary.data ? formatINR(summary.data.approvedExpenditure) : "—"} />
          <SummaryCard label="Pending bills" value={summary.data ? String(summary.data.pendingCount) : "—"} tone="warn" />
          <SummaryCard label="Total bills" value={summary.data ? String(summary.data.totalBills) : "—"} />
          <SummaryCard label="Average bill" value={summary.data ? formatINR(summary.data.averageApprovedBillValue) : "—"} />
        </div>
      )}

      {/* Treasurer Pending Approvals Section */}
      {isTreasurer && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Pending Approval</h2>
            <Link to="/approval" className="text-sm font-medium text-accent transition-colors hover:text-accent-hover">
              Review all →
            </Link>
          </div>
          {pending.loading ? (
            <SkeletonBillRows count={3} />
          ) : (
            <BillList bills={pending.data?.items ?? []} emptyTitle="No pending bills" emptySubtitle="You're all caught up." />
          )}
        </section>
      )}

      {/* Privileged: Inflow Breakdown Strip */}
      {isPrivileged && treasury.data && totalInflow > 0 && (
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink-900">Treasury Inflows by Category</h2>
              <p className="text-xs text-ink-500">Overview of capital secured for Team Asterix</p>
            </div>
            <Link to="/income" className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              Full Income Hub <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link to="/income/installments" className="rounded-md border border-line bg-canvas p-3 transition-colors hover:border-accent">
              <div className="flex items-center gap-1.5 text-xs text-ink-500">
                <CalendarCheck className="h-3.5 w-3.5 text-accent" />
                <span>Installments</span>
              </div>
              <p className="mt-1 text-base font-extrabold text-accent">
                ₹{(treasury.data.inflow.breakdown.installments).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-ink-400">
                {treasury.data.inflow.installmentsProgress.percentage}% of member target
              </p>
            </Link>

            <Link to="/income/events" className="rounded-md border border-line bg-canvas p-3 transition-colors hover:border-blue-500">
              <div className="flex items-center gap-1.5 text-xs text-ink-500">
                <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                <span>Workshops & Events</span>
              </div>
              <p className="mt-1 text-base font-extrabold text-blue-700">
                ₹{(treasury.data.inflow.breakdown.events).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-ink-400">
                {treasury.data.inflow.eventsSummary.totalParticipants} attendees
              </p>
            </Link>

            <Link to="/income/sponsors" className="rounded-md border border-line bg-canvas p-3 transition-colors hover:border-amber-500">
              <div className="flex items-center gap-1.5 text-xs text-ink-500">
                <Award className="h-3.5 w-3.5 text-amber-600" />
                <span>Sponsors</span>
              </div>
              <p className="mt-1 text-base font-extrabold text-amber-700">
                ₹{(treasury.data.inflow.breakdown.sponsorsReceived).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-ink-400">
                +₹{(treasury.data.inflow.breakdown.sponsorsPledged).toLocaleString("en-IN")} pledged
              </p>
            </Link>

            <Link to="/income/misc" className="rounded-md border border-line bg-canvas p-3 transition-colors hover:border-emerald-500">
              <div className="flex items-center gap-1.5 text-xs text-ink-500">
                <WalletCards className="h-3.5 w-3.5 text-status-approved" />
                <span>Miscellaneous</span>
              </div>
              <p className="mt-1 text-base font-extrabold text-status-approved">
                ₹{(treasury.data.inflow.breakdown.misc).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-ink-400">Grants, prizes & scrap</p>
            </Link>
          </div>
        </section>
      )}

      {/* Analytics Charts Grid */}
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

      {/* Recent Bills */}
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
