import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CalendarPlus, AlertTriangle } from "lucide-react";
import { createInstallmentPlan } from "../../../api/income";
import type { InstallmentPlan } from "../../../types/income";

interface CreateMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlan: InstallmentPlan) => void;
}

export function CreateMilestoneModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateMilestoneModalProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setAmount("");
      setDueDate("");
      setDescription("");
      setError(null);
    }
  }, [isOpen]);

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="milestone-title" className="field-label">
              Milestone Title *
            </label>
            <input
              id="milestone-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Installment 1 - Chassis Materials"
              required
              className="field-input mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="milestone-amount" className="field-label">
                Amount Per Member (₹) *
              </label>
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
                  placeholder="3000"
                  required
                  className="field-input !pl-8 font-semibold text-ink-900"
                />
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
