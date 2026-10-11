import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { recordInstallmentPayment, deleteInstallmentPayment } from "../../../api/income";
import type { InstallmentPlan, MemberMatrixRow, PaymentMode } from "../../../types/income";

interface RecordPaymentModalProps {
  isOpen: boolean;
  member: MemberMatrixRow | null;
  plan: InstallmentPlan | null;
  existingPaymentId?: string | null;
  initialAmount?: number;
  initialMode?: PaymentMode | null;
  initialDate?: string | null;
  initialRef?: string;
  initialNotes?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordPaymentModal({
  isOpen,
  member,
  plan,
  existingPaymentId,
  initialAmount,
  initialMode,
  initialDate,
  initialRef,
  initialNotes,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [mode, setMode] = useState<PaymentMode>("UPI");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && plan && member) {
      setAmount(String(initialAmount ?? plan.amount));
      setPaymentDate(initialDate ? initialDate.split("T")[0] : new Date().toISOString().split("T")[0]);
      setMode(initialMode || "UPI");
      setTransactionRef(initialRef || "");
      setNotes(initialNotes || "");
      setError(null);
    }
  }, [isOpen, plan, member, initialAmount, initialMode, initialDate, initialRef, initialNotes]);

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

  if (!isOpen || !member || !plan) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || !member) {
      setError("Missing milestone or member context");
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please provide a valid payment amount");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await recordInstallmentPayment({
        installmentId: plan._id,
        memberId: member.memberId,
        amountPaid: numAmount,
        paidAt: paymentDate,
        paymentMode: mode,
        transactionRef,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record payment";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!existingPaymentId) return;
    if (!window.confirm("Are you sure you want to revert this payment record?")) return;

    try {
      setIsDeleting(true);
      setError(null);
      await deleteInstallmentPayment(existingPaymentId);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revert payment";
      setError(msg);
    } finally {
      setIsDeleting(false);
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
        aria-labelledby="record-payment-title"
        className="card w-full max-w-md animate-scale-up p-6 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-status-approved">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="record-payment-title" className="text-base font-bold text-ink-900">
                {existingPaymentId ? "Update Payment Record" : "Record Installment Payment"}
              </h2>
              <p className="text-xs text-ink-500">
                {member.displayName} · {plan.title}
              </p>
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
          <div className="rounded-md border border-line bg-canvas p-3 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="text-ink-500">Member:</span>
              <span className="font-semibold text-ink-900">{member.displayName}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-ink-500">Milestone:</span>
              <span className="font-semibold text-ink-900">{plan.title}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-ink-500">Milestone Expected:</span>
              <span className="font-semibold text-accent">₹{plan.amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="payment-amount" className="field-label">
                Amount Paid (₹) *
              </label>
              <input
                id="payment-amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="field-input mt-1 font-semibold text-ink-900"
              />
            </div>

            <div>
              <label htmlFor="payment-date" className="field-label">
                Payment Date *
              </label>
              <input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="field-input mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="payment-mode" className="field-label">
                Payment Method
              </label>
              <select
                id="payment-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentMode)}
                className="field-input mt-1"
              >
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="CASH">Cash in Hand</option>
                <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                <option value="OTHER">Other / Cheque</option>
              </select>
            </div>

            <div>
              <label htmlFor="payment-ref" className="field-label">
                UTR / Ref # (Optional)
              </label>
              <input
                id="payment-ref"
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g., 4291823901"
                className="field-input mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="payment-notes" className="field-label">
              Notes / Receipt Details
            </label>
            <input
              id="payment-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Handed cash to Treasurer at workshop"
              className="field-input mt-1"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-xs text-status-rejected">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {existingPaymentId ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-status-rejected hover:bg-status-rejectedSoft"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? "Reverting..." : "Revert"}
              </button>
            ) : <span />}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="btn-secondary !px-4 !py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="btn-primary !px-4 !py-2 text-xs"
              >
                {isSubmitting ? "Saving..." : existingPaymentId ? "Update" : "Mark as Paid"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
