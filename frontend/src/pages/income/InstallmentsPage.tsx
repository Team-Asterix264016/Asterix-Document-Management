import { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  Plus,
  Target,
  Search,
  CheckCircle2,
  Clock,
  User,
  Settings,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getInstallmentsMatrix } from "../../api/income";
import { IncomeSubNav } from "../../components/income/IncomeSubNav";
import { Spinner } from "../../components/ui/Spinner";
import { EditTargetModal } from "../../components/income/modals/EditTargetModal";
import { CreateMilestoneModal } from "../../components/income/modals/CreateMilestoneModal";
import { RecordPaymentModal } from "../../components/income/modals/RecordPaymentModal";
import type { InstallmentPlan, MemberMatrixRow } from "../../types/income";

export function InstallmentsPage() {
  const { data, loading, error, reload } = useAsync(() => getInstallmentsMatrix(), []);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "COMPLETED" | "PENDING">("ALL");

  // Modals state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

  // Payment modal state
  const [selectedMember, setSelectedMember] = useState<MemberMatrixRow | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);
  const [existingPaymentId, setExistingPaymentId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const config = data?.config;
  const plans = data?.plans ?? [];
  const matrix = data?.matrix ?? [];

  // Filtered members
  const filteredMatrix = useMemo(() => {
    return matrix.filter((row) => {
      const matchesSearch =
        row.displayName.toLowerCase().includes(search.toLowerCase()) ||
        row.username.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (filterStatus === "COMPLETED") {
        return row.remaining === 0;
      }
      if (filterStatus === "PENDING") {
        return row.remaining > 0;
      }
      return true;
    });
  }, [matrix, search, filterStatus]);

  function handleOpenPaymentModal(
    member: MemberMatrixRow,
    plan: InstallmentPlan,
    paymentId?: string | null
  ) {
    setSelectedMember(member);
    setSelectedPlan(plan);
    setExistingPaymentId(paymentId || null);
    setIsPaymentModalOpen(true);
  }

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

  return (
    <div className="flex flex-col gap-6">
      {/* Top sticky sub-nav */}
      <IncomeSubNav />

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Team Installments
            </span>
            <span className="text-xs text-ink-500">
              {config?.totalMembers ?? 0} Registered Members
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">Member Installment Tracking</h1>
          <p className="text-xs text-ink-500">
            Track individual member dues, milestone payments, and manage seasonal target commitments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTargetModalOpen(true)}
            className="btn-secondary !px-3 !py-1.5 text-xs"
            title="Edit target amount per member"
          >
            <Settings className="h-3.5 w-3.5" />
            Edit Target (₹{config?.targetPerMember.toLocaleString("en-IN")})
          </button>
          <button
            onClick={() => setIsMilestoneModalOpen(true)}
            className="btn-primary !px-3.5 !py-1.5 text-xs"
          >
            <Plus className="h-4 w-4" />
            Create Milestone
          </button>
          <button
            onClick={() => reload()}
            className="btn-secondary !p-1.5 text-xs"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-status-rejected/30 bg-status-rejectedSoft p-4 text-xs text-status-rejected">
          Failed to load installments: {error}
        </div>
      )}

      {/* Target Progress & Summary Banner */}
      <div className="card border-accent/20 bg-gradient-to-r from-accent/5 via-surface to-accent/5 p-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Target setting card */}
          <div className="md:border-r md:border-line md:pr-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-500">Per-Member Target</span>
              <button
                onClick={() => setIsTargetModalOpen(true)}
                className="text-[11px] font-bold text-accent hover:underline"
              >
                Change
              </button>
            </div>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">
              ₹{(config?.targetPerMember ?? 10000).toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              Season total commitment per team member
            </p>
          </div>

          {/* Overall team collection */}
          <div className="md:border-r md:border-line md:pr-4">
            <span className="text-xs font-semibold text-ink-500">Team Total Collected</span>
            <p className="mt-1 text-2xl font-extrabold text-status-approved">
              ₹{(config?.totalCollected ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              Goal: ₹{(config?.totalExpected ?? 0).toLocaleString("en-IN")} ({config?.totalMembers ?? 0} members)
            </p>
          </div>

          {/* Total Pending */}
          <div className="md:border-r md:border-line md:pr-4">
            <span className="text-xs font-semibold text-ink-500">Total Pending Dues</span>
            <p className="mt-1 text-2xl font-extrabold text-amber-600">
              ₹{(config?.totalPending ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              Awaiting collection across milestones
            </p>
          </div>

          {/* Progress ring / bar */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-ink-700">Team Collection Progress</span>
              <span className="text-accent">{config?.collectionPercentage ?? 0}%</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${Math.min(100, config?.collectionPercentage ?? 0)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-ink-400">
              {config?.collectionPercentage ?? 0}% of overall target secured
            </p>
          </div>
        </div>
      </div>

      {/* Active Installment Milestones Strip */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink-900">Installment Milestones</h2>
            <p className="text-xs text-ink-500">Active deadlines created by the Treasurer</p>
          </div>
          <span className="text-xs font-medium text-ink-500">
            {plans.length} milestone{plans.length === 1 ? "" : "s"} scheduled
          </span>
        </div>

        {plans.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const paidCount = matrix.filter(
                (m) => m.installments.find((i) => i.planId === plan._id)?.status === "PAID"
              ).length;
              const pct = matrix.length > 0 ? Math.round((paidCount / matrix.length) * 100) : 0;
              const isOverdue = new Date(plan.dueDate).getTime() < Date.now();

              return (
                <div key={plan._id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink-900">{plan.title}</span>
                      <p className="text-[11px] text-ink-500 line-clamp-1">{plan.description || "General installment"}</p>
                    </div>
                    <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-extrabold text-accent">
                      ₹{plan.amount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-ink-500">
                      <Clock className="h-3.5 w-3.5" />
                      Due: {new Date(plan.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {isOverdue && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        Deadline Passed
                      </span>
                    )}
                  </div>

                  <div className="mt-3 border-t border-line pt-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-ink-600 font-medium">
                        Paid: <strong>{paidCount}</strong> / {matrix.length} members
                      </span>
                      <span className="font-bold text-accent">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center p-8 text-center">
            <Target className="h-8 w-8 text-ink-300" />
            <h3 className="mt-2 text-sm font-bold text-ink-900">No installment milestones created yet</h3>
            <p className="mt-1 text-xs text-ink-500">
              Create your first installment milestone (e.g., Installment 1: ₹3,000) to start tracking.
            </p>
            <button
              onClick={() => setIsMilestoneModalOpen(true)}
              className="btn-primary mt-3 !px-3.5 !py-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Create First Milestone
            </button>
          </div>
        )}
      </div>

      {/* Member Payment Matrix Table */}
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink-900">Member Payment Ledger</h2>
            <p className="text-xs text-ink-500">
              Click on any milestone status to mark as paid or view/revert receipts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member name..."
                className="field-input !py-1.5 !pl-8 text-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center rounded-md border border-line bg-canvas p-0.5 text-xs font-semibold">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`rounded px-2.5 py-1 ${
                  filterStatus === "ALL"
                    ? "bg-surface text-ink-900 shadow-xs"
                    : "text-ink-500 hover:text-ink-900"
                }`}
              >
                All ({matrix.length})
              </button>
              <button
                onClick={() => setFilterStatus("COMPLETED")}
                className={`rounded px-2.5 py-1 ${
                  filterStatus === "COMPLETED"
                    ? "bg-surface text-status-approved shadow-xs"
                    : "text-ink-500 hover:text-ink-900"
                }`}
              >
                Fully Paid
              </button>
              <button
                onClick={() => setFilterStatus("PENDING")}
                className={`rounded px-2.5 py-1 ${
                  filterStatus === "PENDING"
                    ? "bg-surface text-amber-700 shadow-xs"
                    : "text-ink-500 hover:text-ink-900"
                }`}
              >
                Pending Dues
              </button>
            </div>
          </div>
        </div>

        {filteredMatrix.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas text-[11px] font-semibold text-ink-500">
                <tr>
                  <th className="py-2.5 pl-3">Team Member</th>
                  <th className="py-2.5">Progress vs ₹{(config?.targetPerMember ?? 10000).toLocaleString("en-IN")}</th>
                  <th className="py-2.5">Total Paid</th>
                  <th className="py-2.5">Remaining</th>
                  {plans.map((p) => (
                    <th key={p._id} className="py-2.5 text-center min-w-[140px]">
                      {p.title}
                      <span className="block text-[10px] font-normal text-ink-400">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </span>
                    </th>
                  ))}
                  <th className="py-2.5 pr-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredMatrix.map((row) => {
                  const isFullyPaid = row.remaining === 0;

                  return (
                    <tr key={row.memberId} className="hover:bg-surface-hover transition-colors">
                      {/* Member Info */}
                      <td className="py-3 pl-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                            {row.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-ink-900">{row.displayName}</p>
                            <p className="text-[10px] text-ink-400 font-mono">@{row.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3 min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isFullyPaid ? "bg-status-approved" : "bg-accent"
                              }`}
                              style={{ width: `${row.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-ink-600">
                            {row.progressPercent}%
                          </span>
                        </div>
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 font-bold text-ink-900">
                        ₹{row.totalPaid.toLocaleString("en-IN")}
                      </td>

                      {/* Remaining */}
                      <td className="py-3">
                        {isFullyPaid ? (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-status-approved">
                            ✓ Fully Settled
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-600">
                            ₹{row.remaining.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Milestones status columns */}
                      {row.installments.map((inst) => {
                        const targetPlan = plans.find((p) => p._id === inst.planId);
                        if (!targetPlan) return null;

                        return (
                          <td key={inst.planId} className="py-3 text-center">
                            {inst.status === "PAID" ? (
                              <button
                                onClick={() => handleOpenPaymentModal(row, targetPlan, inst.paymentId)}
                                className="group inline-flex flex-col items-center rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-semibold text-status-approved hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                                title={`Paid on ${inst.paidAt ? new Date(inst.paidAt).toLocaleDateString() : ""} via ${inst.paymentMode}. Click to edit/revert.`}
                              >
                                <span className="flex items-center gap-1 font-bold">
                                  <CheckCircle2 className="h-3 w-3" />
                                  ₹{inst.amountPaid.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[9px] text-emerald-700">
                                  {inst.paidAt ? new Date(inst.paidAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : ""} · {inst.paymentMode}
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenPaymentModal(row, targetPlan, null)}
                                className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-500 hover:border-accent hover:text-accent hover:bg-accent-soft transition-all"
                                title="Click to mark this milestone as paid"
                              >
                                <Plus className="h-3 w-3" /> Mark Paid
                              </button>
                            )}
                          </td>
                        );
                      })}

                      {/* Row Action */}
                      <td className="py-3 pr-3 text-right">
                        {plans.length > 0 && (
                          <button
                            onClick={() => {
                              // Find first unpaid milestone, or default to first
                              const firstPending = row.installments.find((i) => i.status === "PENDING");
                              const targetPlan = plans.find((p) => p._id === (firstPending?.planId || plans[0]._id)) || plans[0];
                              handleOpenPaymentModal(row, targetPlan, firstPending ? null : row.installments[0]?.paymentId);
                            }}
                            className="btn-secondary !px-2.5 !py-1 text-[11px]"
                          >
                            + Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-ink-500">
            No team members found matching your filter criteria.
          </div>
        )}
      </div>

      {/* Modals */}
      <EditTargetModal
        isOpen={isTargetModalOpen}
        currentTarget={config?.targetPerMember ?? 10000}
        onClose={() => setIsTargetModalOpen(false)}
        onSuccess={() => reload()}
      />

      <CreateMilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        onSuccess={() => reload()}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        member={selectedMember}
        plan={selectedPlan}
        existingPaymentId={existingPaymentId}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedMember(null);
          setSelectedPlan(null);
          setExistingPaymentId(null);
        }}
        onSuccess={() => reload()}
      />
    </div>
  );
}
