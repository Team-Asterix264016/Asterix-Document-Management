import { useState } from "react";
import { useAsync } from "../hooks/useAsync";
import * as analyticsApi from "../api/analytics";
import { listSubsystems } from "../api/subsystems";
import { SummaryCard } from "../components/ui/SummaryCard";
import { SkeletonChart, SkeletonSummaryCards } from "../components/ui/Skeleton";
import { formatINR } from "../utils/format";
import { truncateTick } from "../utils/chart";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  Approved: "#2F6B3A",
  Pending: "#B8862B",
  Rejected: "#A23B32",
};

export function Analytics() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [subsystem, setSubsystem] = useState("");

  const filters = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, subsystem: subsystem || undefined };

  const subsystems = useAsync(() => listSubsystems(), []);
  const summary = useAsync(() => analyticsApi.getSummary(filters), [dateFrom, dateTo, subsystem]);
  const categories = useAsync(() => analyticsApi.getCategories(filters), [dateFrom, dateTo, subsystem]);
  const monthly = useAsync(() => analyticsApi.getMonthly(filters), [dateFrom, dateTo, subsystem]);
  const vendors = useAsync(() => analyticsApi.getVendors(filters), [dateFrom, dateTo, subsystem]);
  const users = useAsync(() => analyticsApi.getUsers(filters), [dateFrom, dateTo, subsystem]);
  const approvals = useAsync(() => analyticsApi.getApprovals(filters), [dateFrom, dateTo, subsystem]);

  const statusDistribution = summary.data
    ? [
        { name: "Approved", value: summary.data.approvedExpenditure },
        { name: "Pending", value: summary.data.pendingExpenditure },
        { name: "Rejected", value: summary.data.rejectedExpenditure },
      ].filter((s) => s.value > 0)
    : [];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-ink-900">Analytics</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          aria-label="From date"
          className="field-input flex-1 sm:max-w-[160px] sm:flex-none"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          aria-label="To date"
          className="field-input flex-1 sm:max-w-[160px] sm:flex-none"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <select className="field-input w-full sm:max-w-[200px]" value={subsystem} onChange={(e) => setSubsystem(e.target.value)}>
          <option value="">All subsystems</option>
          {subsystems.data?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {summary.loading ? (
        <SkeletonSummaryCards />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Approved" value={summary.data ? formatINR(summary.data.approvedExpenditure) : "—"} />
          <SummaryCard label="Pending" value={summary.data ? formatINR(summary.data.pendingExpenditure) : "—"} tone="warn" />
          <SummaryCard label="Rejected" value={summary.data ? formatINR(summary.data.rejectedExpenditure) : "—"} />
          <SummaryCard
            label="Avg. approval time"
            value={approvals.data?.averageApprovalTurnaroundHours != null ? `${Math.round(approvals.data.averageApprovalTurnaroundHours)}h` : "—"}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <p className="field-label">Spending by Subsystem</p>
          {categories.loading ? (
            <SkeletonChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
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
                <YAxis tick={{ fontSize: 11, fill: "#7A7468" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatINR(v)} width={68} />
                <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ borderRadius: 8, borderColor: "#E7E2D8", fontSize: 13 }} />
                <Bar dataKey="total" fill="#2F5D50" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card p-4">
          <p className="field-label">Spending Trend</p>
          {monthly.loading ? (
            <SkeletonChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthly.data ?? []} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#7A7468" }} tickLine={false} axisLine={{ stroke: "#E7E2D8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#7A7468" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatINR(v)} width={68} />
                <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ borderRadius: 8, borderColor: "#E7E2D8", fontSize: 13 }} />
                <Line type="monotone" dataKey="total" stroke="#2F5D50" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card p-4">
          <p className="field-label">Approval Status Split</p>
          {summary.loading ? (
            <SkeletonChart />
          ) : statusDistribution.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-ink-500">No spending recorded yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ borderRadius: 8, borderColor: "#E7E2D8", fontSize: 13 }} />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  formatter={(value) => <span className="text-xs text-ink-700">{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card p-4">
          <p className="field-label">Team Spending</p>
          {users.loading ? (
            <SkeletonChart />
          ) : (users.data ?? []).length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-ink-500">No approved spending yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={users.data ?? []} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#7A7468" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatINR(v)} />
                <YAxis
                  dataKey="user"
                  type="category"
                  tick={{ fontSize: 11, fill: "#7A7468" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E7E2D8" }}
                  width={90}
                  tickFormatter={truncateTick}
                />
                <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ borderRadius: 8, borderColor: "#E7E2D8", fontSize: 13 }} />
                <Bar dataKey="total" fill="#3D5A80" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <section className="card p-4">
        <p className="field-label">Top Vendors</p>
        {vendors.loading ? (
          <SkeletonChart />
        ) : (vendors.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No vendor spending yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {(vendors.data ?? []).slice(0, 10).map((v) => (
              <div key={v.vendor} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-ink-700">{v.vendor}</span>
                <span className="shrink-0 tabular-nums font-medium text-ink-900">{formatINR(v.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
