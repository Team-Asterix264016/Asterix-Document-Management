import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CalendarPlus, AlertTriangle, Layers, CalendarRange } from "lucide-react";
import { createInstallmentPlan } from "../../../api/income";
import type { InstallmentPlan, InstallmentPlanType } from "../../../types/income";

interface CreateMilestoneModalProps {
  isOpen: boolean;
  initialType?: InstallmentPlanType;
  onClose: () => void;
  onSuccess: (newPlan: InstallmentPlan) => void;
}

export function CreateMilestoneModal({
  isOpen,
  initialType = "SEASON_MILESTONE",
  onClose,
  onSuccess,
}: CreateMilestoneModalProps) {
  const [planType, setPlanType] = useState<InstallmentPlanType>(initialType);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [billingMonth, setBillingMonth] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to format Month (YYYY-MM to "October 2026")
  function formatMonthLabel(monthStr: string) {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
  }

  function handleTypeChange(type: InstallmentPlanType) {
    setPlanType(type);
    if (type === "MONTHLY_CHIT") {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const currentMonthVal = `${yyyy}-${mm}`;
      setBillingMonth(currentMonthVal);
      setAmount("");
      const monthLabel = formatMonthLabel(currentMonthVal);
      setTitle(`${monthLabel} - Monthly Contribution`);
      const lastDay = new Date(yyyy, now.getMonth() + 1, 0).toISOString().split("T")[0];
      setDueDate(lastDay);
      setDescription("");
    } else {
      setAmount("");
      setTitle("");
      setBillingMonth("");
      setDescription("");
      setDueDate("");
    }
  }

  useEffect(() => {
    if (isOpen) {
      const selectedType = initialType || "SEASON_MILESTONE";
      setPlanType(selectedType);
      if (selectedType === "MONTHLY_CHIT") {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const currentMonthVal = `${yyyy}-${mm}`;
        setBillingMonth(currentMonthVal);
        setAmount("");
        const monthLabel = formatMonthLabel(currentMonthVal);
        setTitle(`${monthLabel} - Monthly Contribution`);
        const lastDay = new Date(yyyy, now.getMonth() + 1, 0).toISOString().split("T")[0];
        setDueDate(lastDay);
        setDescription("");
      } else {
        setTitle("");
        setAmount("");
        setDueDate("");
        setBillingMonth("");
        setDescription("");
      }
      setError(null);
    }
  }, [isOpen, initialType]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!title.trim()) {
      setError("Please provide a milestone title");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please provide a valid milestone amount");
      return;
    }
    if (!dueDate) {
      setError("Please select a due date");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await createInstallmentPlan({
        title: title.trim(),
        amount: numAmount,
        dueDate,
        planType,
        billingMonth: planType === "MONTHLY_CHIT" ? formatMonthLabel(billingMonth) : undefined,
        description: description.trim(),
      });
      onSuccess(res.item);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create installment milestone";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm animate-fade-in"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-milestone-title"
        className="card w-full max-w-lg animate-scale-up p-6 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="create-milestone-title" className="text-base font-bold text-ink-900">
                Create Installment Milestone
              </h2>
              <p className="text-xs text-ink-500">Add a structured installment deadline for team members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-400 hover:bg-surface hover:text-ink-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Plan Type Selector */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-canvas p-1">
          <button
            type="button"
            onClick={() => handleTypeChange("SEASON_MILESTONE")}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-bold transition-all ${
              planType === "SEASON_MILESTONE"
                ? "bg-surface text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-800"
            }`}
          >
            <Layers className="h-4 w-4 text-accent" />
            Seasonal Milestone (Build Target)
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("MONTHLY_CHIT")}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-bold transition-all ${
              planType === "MONTHLY_CHIT"
                ? "bg-surface text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-800"
            }`}
          >
            <CalendarRange className="h-4 w-4 text-purple-600" />
            Monthly / Recurring Installment
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {planType === "MONTHLY_CHIT" ? (
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
              <label htmlFor="billing-month" className="field-label !text-purple-900">
                Billing Month *
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  id="billing-month"
                  type="month"
                  value={billingMonth}
                  onChange={(e) => {
                    const m = e.target.value;
                    setBillingMonth(m);
                    const label = formatMonthLabel(m);
                    setTitle(`${label} - Monthly Installment`);
                    if (m) {
                      const [yr, mo] = m.split("-").map(Number);
                      const lastDay = new Date(yr, mo, 0).toISOString().split("T")[0];
                      setDueDate(lastDay);
                    }
                  }}
                  required
                  className="field-input font-medium"
                />
                <span className="text-xs font-bold text-purple-800">
                  {formatMonthLabel(billingMonth)}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-purple-700">
                Monthly dues or pool contribution (any purpose, flexible amount).
              </p>
            </div>
          ) : null}

          <div>
            <label htmlFor="milestone-title" className="field-label">
              {planType === "MONTHLY_CHIT" ? "Installment Purpose / Title *" : "Milestone Title *"}
            </label>
            <input
              id="milestone-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                planType === "MONTHLY_CHIT"
                  ? "e.g., October 2026 - Chit Fund, Tool Pool, Club Dues"
                  : "e.g., Installment 1 - Chassis Materials"
              }
              required
              className="field-input mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="milestone-amount" className="field-label">
                  Amount Per Member (₹) *
                </label>
                <span className="text-[10px] text-ink-400">Dynamic</span>
              </div>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-ink-400">
                  ₹
                </span>
                <input
                  id="milestone-amount"
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter custom amount"
                  required
                  className="field-input !pl-8 font-semibold text-ink-900"
                />
              </div>
              {/* Presets */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-ink-400">Quick set:</span>
                {planType === "MONTHLY_CHIT"
                  ? ["180", "200", "250", "500", "1000"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAmount(p)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          amount === p ? "bg-purple-600 text-white" : "bg-canvas text-ink-600 hover:bg-line"
                        }`}
                      >
                        ₹{p}
                      </button>
                    ))
                  : ["2500", "3000", "5000"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAmount(p)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          amount === p ? "bg-accent text-white" : "bg-canvas text-ink-600 hover:bg-line"
                        }`}
                      >
                        ₹{Number(p).toLocaleString("en-IN")}
                      </button>
                    ))}
              </div>
            </div>

            <div>
              <label htmlFor="milestone-due" className="field-label">
                Payment Due Date *
              </label>
              <input
                id="milestone-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="field-input mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="milestone-desc" className="field-label">
              Description / Instructions (Optional)
            </label>
            <textarea
              id="milestone-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Purpose of this installment milestone (procurement, raw materials, etc.)"
              className="field-input mt-1 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-xs text-status-rejected">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary !px-4 !py-2 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary !px-4 !py-2 text-xs"
            >
              {isSubmitting ? "Creating..." : "Create Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
