import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, WalletCards, AlertTriangle } from "lucide-react";
import { createIncomeMisc, updateIncomeMisc } from "../../../api/income";
import type { IncomeMisc, MiscCategory, PaymentMode } from "../../../types/income";

interface MiscIncomeModalProps {
  isOpen: boolean;
  miscToEdit: IncomeMisc | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function MiscIncomeModal({
  isOpen,
  miscToEdit,
  onClose,
  onSuccess,
}: MiscIncomeModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MiscCategory>("OTHER");
  const [amount, setAmount] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (miscToEdit) {
        setTitle(miscToEdit.title);
        setCategory(miscToEdit.category || "OTHER");
        setAmount(String(miscToEdit.amount));
        setDateReceived(miscToEdit.dateReceived ? miscToEdit.dateReceived.split("T")[0] : "");
        setReceivedBy(miscToEdit.receivedBy || "");
        setPaymentMode(miscToEdit.paymentMode || "UPI");
        setNotes(miscToEdit.notes || "");
      } else {
        setTitle("");
        setCategory("OTHER");
        setAmount("");
        setDateReceived(new Date().toISOString().split("T")[0]);
        setReceivedBy("");
        setPaymentMode("UPI");
        setNotes("");
      }
      setError(null);
    }
  }, [isOpen, miscToEdit]);

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
      setError("Please provide a title or description");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please provide a valid income amount");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const payload = {
        title: title.trim(),
        category,
        amount: numAmount,
        dateReceived: dateReceived || new Date().toISOString(),
        receivedBy: receivedBy.trim(),
        paymentMode,
        notes: notes.trim(),
      };

      if (miscToEdit) {
        await updateIncomeMisc(miscToEdit._id, payload);
      } else {
        await createIncomeMisc(payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save entry";
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
        aria-labelledby="misc-modal-title"
        className="card w-full max-w-lg animate-scale-up p-6 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
              <WalletCards className="h-5 w-5" />
            </div>
            <div>
              <h2 id="misc-modal-title" className="text-base font-bold text-ink-900">
                {miscToEdit ? "Edit Miscellaneous Inflow" : "Record Miscellaneous Inflow"}
              </h2>
              <p className="text-xs text-ink-500">Log ad-hoc income, grants, scrap sales, or prizes</p>
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
            <label htmlFor="misc-title" className="field-label">
              Description / Inflow Source *
            </label>
            <input
              id="misc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sale of leftover scrap mild steel tubes"
              required
              className="field-input mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="misc-category" className="field-label">
                Income Category
              </label>
              <select
                id="misc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MiscCategory)}
                className="field-input mt-1"
              >
                <option value="COLLEGE_GRANT">College / Department Grant</option>
                <option value="PRIZE_MONEY">Prize / Competition Award</option>
                <option value="SCRAP_SALE">Scrap / Material Sale</option>
                <option value="MERCHANDISE">Team Merchandise Sales</option>
                <option value="DONATION">Individual Donation</option>
                <option value="OTHER">Other Miscellaneous</option>
              </select>
            </div>

            <div>
              <label htmlFor="misc-amount" className="field-label">
                Amount Received (₹) *
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-ink-400">
                  ₹
                </span>
                <input
                  id="misc-amount"
                  type="number"
                  min="1"
                  step="50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="3500"
                  required
                  className="field-input !pl-8 font-semibold text-ink-900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="misc-date" className="field-label">
                Date Received
              </label>
              <input
                id="misc-date"
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="field-input mt-1"
              />
            </div>

            <div>
              <label htmlFor="misc-mode" className="field-label">
                Payment Method
              </label>
              <select
                id="misc-mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="field-input mt-1"
              >
                <option value="UPI">UPI / Digital</option>
                <option value="CASH">Cash in Hand</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="misc-receivedby" className="field-label">
              Received By / Handler (Optional)
            </label>
            <input
              id="misc-receivedby"
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="e.g., Arya A (Treasurer)"
              className="field-input mt-1"
            />
          </div>

          <div>
            <label htmlFor="misc-notes" className="field-label">
              Notes / Receipt Reference
            </label>
            <input
              id="misc-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Sold to industrial scrap dealer at Peenya"
              className="field-input mt-1"
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
              {isSubmitting ? "Saving..." : miscToEdit ? "Update Inflow" : "Record Inflow"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
