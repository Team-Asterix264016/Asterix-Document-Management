import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  CalendarCheck,
  GraduationCap,
  Award,
  WalletCards,
  ArrowRight,
  Plus,
  RefreshCw,
  Coins,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getTreasuryOverview } from "../../api/income";
import { IncomeSubNav } from "../../components/income/IncomeSubNav";
import { Spinner } from "../../components/ui/Spinner";
import { EventModal } from "../../components/income/modals/EventModal";
import { SponsorModal } from "../../components/income/modals/SponsorModal";
import { MiscIncomeModal } from "../../components/income/modals/MiscIncomeModal";

export function IncomeOverview() {
  const { data, loading, error, reload } = useAsync(() => getTreasuryOverview(), []);

  // Quick modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <IncomeSubNav />
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      </div>
    );
  }

  const inflow = data?.inflow;
  const totalInflow = inflow?.total ?? 0;
  const breakdown = inflow?.breakdown;

  const installmentPct = totalInflow > 0 ? Math.round(((breakdown?.installments ?? 0) / totalInflow) * 100) : 0;
  const eventPct = totalInflow > 0 ? Math.round(((breakdown?.events ?? 0) / totalInflow) * 100) : 0;
  const sponsorPct = totalInflow > 0 ? Math.round(((breakdown?.sponsorsReceived ?? 0) / totalInflow) * 100) : 0;
  const miscPct = totalInflow > 0 ? Math.round(((breakdown?.misc ?? 0) / totalInflow) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Top sticky sub-nav */}
      <IncomeSubNav />

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Season {data?.config?.season ?? "2026-27"}
            </span>
            <span className="text-xs text-ink-500">
              {data?.config?.activeMembersCount ?? 0} Active Team Members
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">Treasury & Income Hub</h1>
          <p className="text-xs text-ink-500">
            Supervise all financial incoming avenues, participant fees, and team installments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => reload()}
            className="btn-secondary !px-3 !py-1.5 text-xs"
            title="Refresh treasury data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-status-rejected/30 bg-status-rejectedSoft p-4 text-xs text-status-rejected">
          Failed to load treasury data: {error}
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Inflows */}
        <div className="card relative overflow-hidden p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">Total Inflow Received</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-status-approved">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink-900">
            ₹{totalInflow.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Across all 4 revenue avenues</p>
        </div>

        {/* Team Installments */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">Team Installments</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-accent">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-accent">
            ₹{(breakdown?.installments ?? 0).toLocaleString("en-IN")}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${Math.min(100, inflow?.installmentsProgress?.percentage ?? 0)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-ink-600">
              {inflow?.installmentsProgress?.percentage ?? 0}%
            </span>
          </div>
        </div>

        {/* Workshops & Events */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">Workshops & Events</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink-900">
            ₹{(breakdown?.events ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">
            {inflow?.eventsSummary?.totalParticipants ?? 0} total attendees
          </p>
        </div>

        {/* Sponsors & Grants */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">Sponsorships</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink-900">
            ₹{(breakdown?.sponsorsReceived ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-amber-600">
            +₹{(breakdown?.sponsorsPledged ?? 0).toLocaleString("en-IN")} pledged
          </p>
        </div>
      </div>

      {/* Revenue Stream Breakdown Bar */}
      {totalInflow > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Inflow Avenue Distribution
          </h2>
          <div className="mt-3 flex h-3.5 w-full overflow-hidden rounded-full bg-line">
            <div
              style={{ width: `${installmentPct}%` }}
              className="bg-accent transition-all"
              title={`Installments: ${installmentPct}%`}
            />
            <div
              style={{ width: `${eventPct}%` }}
              className="bg-blue-600 transition-all"
              title={`Events: ${eventPct}%`}
            />
            <div
              style={{ width: `${sponsorPct}%` }}
              className="bg-amber-500 transition-all"
              title={`Sponsors: ${sponsorPct}%`}
            />
            <div
              style={{ width: `${miscPct}%` }}
              className="bg-emerald-600 transition-all"
              title={`Misc: ${miscPct}%`}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="text-ink-600">Installments ({installmentPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-ink-600">Events ({eventPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-ink-600">Sponsors ({sponsorPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span className="text-ink-600">Miscellaneous ({miscPct}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Category Navigation Cards */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-ink-900">Manage Income Streams</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Installments */}
          <Link
            to="/income/installments"
            className="card group flex flex-col justify-between p-5 transition-all duration-150 hover:border-accent hover:shadow-subtle"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-ink-900">Team Installments</h3>
              <p className="mt-1 text-xs text-ink-500">
                Track payments towards ₹{(data?.config?.targetPerMember ?? 10000).toLocaleString("en-IN")} target per member
              </p>
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Collected:</span>
                <span className="font-bold text-accent">
                  ₹{(breakdown?.installments ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </Link>

          {/* Card 2: Workshops & Events */}
          <Link
            to="/income/events"
            className="card group flex flex-col justify-between p-5 transition-all duration-150 hover:border-blue-500 hover:shadow-subtle"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-ink-900">Workshops & Events</h3>
              <p className="mt-1 text-xs text-ink-500">
                Multi-tier pricing structures with dynamic headcount calculations
              </p>
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Revenue:</span>
                <span className="font-bold text-blue-700">
                  ₹{(breakdown?.events ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </Link>

          {/* Card 3: Sponsors */}
          <Link
            to="/income/sponsors"
            className="card group flex flex-col justify-between p-5 transition-all duration-150 hover:border-amber-500 hover:shadow-subtle"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Award className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-600" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-ink-900">Sponsorships</h3>
              <p className="mt-1 text-xs text-ink-500">
                Manage title, platinum, gold sponsors and pledged amounts
              </p>
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Received:</span>
                <span className="font-bold text-amber-700">
                  ₹{(breakdown?.sponsorsReceived ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </Link>

          {/* Card 4: Miscellaneous */}
          <Link
            to="/income/misc"
            className="card group flex flex-col justify-between p-5 transition-all duration-150 hover:border-emerald-500 hover:shadow-subtle"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-status-approved">
                  <WalletCards className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-status-approved" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-ink-900">Miscellaneous Inflow</h3>
              <p className="mt-1 text-xs text-ink-500">
                Grants, prize money, scrap sales, merchandise, and ad-hoc inflows
              </p>
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Amount:</span>
                <span className="font-bold text-status-approved">
                  ₹{(breakdown?.misc ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Inflows Table */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink-900">Recent Treasury Inflows</h2>
            <p className="text-xs text-ink-500">Latest funds received across all streams</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-surface-hover"
            >
              <Plus className="h-3 w-3" /> Event
            </button>
            <button
              onClick={() => setIsSponsorModalOpen(true)}
              className="flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-surface-hover"
            >
              <Plus className="h-3 w-3" /> Sponsor
            </button>
            <button
              onClick={() => setIsMiscModalOpen(true)}
              className="flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-surface-hover"
            >
              <Plus className="h-3 w-3" /> Misc
            </button>
          </div>
        </div>

        {data?.recentInflows && data.recentInflows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas text-[11px] font-semibold text-ink-500">
                <tr>
                  <th className="py-2.5 pl-3">Date</th>
                  <th className="py-2.5">Avenue</th>
                  <th className="py-2.5">Source / Member / Title</th>
                  <th className="py-2.5">Details</th>
                  <th className="py-2.5 pr-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.recentInflows.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-surface-hover transition-colors">
                    <td className="py-2.5 pl-3 font-medium text-ink-600">
                      {new Date(item.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2.5">
                      {item.type === "INSTALLMENT" && (
                        <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                          Installment
                        </span>
                      )}
                      {item.type === "EVENT" && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          Workshop / Event
                        </span>
                      )}
                      {item.type === "SPONSOR" && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Sponsorship
                        </span>
                      )}
                      {item.type === "MISC" && (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-status-approved">
                          Miscellaneous
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 font-semibold text-ink-900">{item.title}</td>
                    <td className="py-2.5 text-ink-500">{item.meta || "—"}</td>
                    <td className="py-2.5 pr-3 text-right font-bold text-status-approved">
                      +₹{item.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Coins className="h-8 w-8 text-ink-300" />
            <p className="mt-2 text-xs font-medium text-ink-500">No incoming transactions recorded yet.</p>
          </div>
        )}
      </div>

      {/* Quick Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        eventToEdit={null}
        onClose={() => setIsEventModalOpen(false)}
        onSuccess={() => reload()}
      />
      <SponsorModal
        isOpen={isSponsorModalOpen}
        sponsorToEdit={null}
        onClose={() => setIsSponsorModalOpen(false)}
        onSuccess={() => reload()}
      />
      <MiscIncomeModal
        isOpen={isMiscModalOpen}
        miscToEdit={null}
        onClose={() => setIsMiscModalOpen(false)}
        onSuccess={() => reload()}
      />
    </div>
  );
}
