import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Target, CheckCircle2, AlertTriangle } from "lucide-react";
import { updateTreasurySettings } from "../../../api/income";

interface EditTargetModalProps {
  isOpen: boolean;
  currentTarget: number;
  onClose: () => void;
  onSuccess: (newTarget: number) => void;
}

export function EditTargetModal({
  isOpen,
  currentTarget,
  onClose,
  onSuccess,
}: EditTargetModalProps) {
  const [targetAmount, setTargetAmount] = useState(String(currentTarget));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetAmount(String(currentTarget));
    setError(null);
  }, [currentTarget, isOpen]);

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
    const val = Number(targetAmount);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid positive target amount");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await updateTreasurySettings(val);
      onSuccess(res.config.targetPerMember);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update target amount";
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
        aria-labelledby="edit-target-title"
        className="card w-full max-w-md animate-scale-up p-6 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 id="edit-target-title" className="text-base font-bold text-ink-900">
                Configure Member Target
              </h2>
              <p className="text-xs text-ink-500">Set total expected contribution per member</p>
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
            <label htmlFor="target-input" className="field-label">
              Target Amount Per Member (₹) *
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-ink-400">
                ₹
              </span>
              <input
                id="target-input"
                type="number"
                min="0"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
                className="field-input !pl-8 font-semibold text-ink-900"
                placeholder="10000"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-ink-500">
              The overall team goal is calculated dynamically as this amount multiplied by active team members.
            </p>
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
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Target"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
