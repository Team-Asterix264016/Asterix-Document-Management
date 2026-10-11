import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { InventoryItem } from "../../types";
import { toggleMissing } from "../../api/inventory";
import { createToBuy } from "../../api/toBuy";
import { useToast } from "../ui/Toast";
import { X, AlertOctagon, CheckCircle2, ShoppingCart, MapPin, FileText } from "lucide-react";

interface Props {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function MissingModal({ isOpen, item, onClose, onSuccess }: Props) {
  const { push } = useToast();
  const [notes, setNotes] = useState("");
  const [lastKnownLocation, setLastKnownLocation] = useState("");
  const [addToBuyList, setAddToBuyList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (item) {
      setNotes("");
      setLastKnownLocation(item.location || "");
      setAddToBuyList(true);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const isCurrentlyMissing = item.status === "MISSING" || item.missingDetails?.isMissing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isCurrentlyMissing) {
        // Mark as Found
        await toggleMissing(item._id, {
          isMissing: false,
          notes: notes.trim(),
          lastKnownLocation: lastKnownLocation.trim(),
        });
        push(`"${item.name}" marked as found and restored to inventory!`, "success");
      } else {
        // Mark as Missing
        await toggleMissing(item._id, {
          isMissing: true,
          notes: notes.trim(),
          lastKnownLocation: lastKnownLocation.trim(),
        });

        if (addToBuyList) {
          try {
            await createToBuy({
              itemName: item.name,
              category: item.category,
              quantity: item.quantity || 1,
              unit: item.unit || "pcs",
              priority: "HIGH",
              sourceInventoryItem: item._id as any,
              notes: `Replacement request: Flagged missing from ${lastKnownLocation || item.location}. Note: ${notes}`,
            });
            push(`"${item.name}" marked as MISSING and replacement added to To-Buy list!`, "info");
          } catch {
            push(`"${item.name}" marked as missing (failed to auto-create to-buy item)`, "info");
          }
        } else {
          push(`"${item.name}" flagged as MISSING`, "info");
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Failed to update missing status";
      push(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-card animate-fade-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                isCurrentlyMissing
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {isCurrentlyMissing ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertOctagon className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">
                {isCurrentlyMissing ? "Mark Component as Found" : "Report Component Missing"}
              </h2>
              <p className="text-xs text-ink-500 line-clamp-1">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-canvas hover:text-ink-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning or Info Banner */}
        <div
          className={`mt-4 rounded-lg border p-3.5 text-xs ${
            isCurrentlyMissing
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {isCurrentlyMissing ? (
            <p>
              This will remove the missing status and restore the component to{" "}
              <strong>Available</strong> in the designated workshop location.
            </p>
          ) : (
            <p>
              Marking this component as <strong>Missing</strong> will alert team leads and flag it in the Missing Assets registry until located.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="field-label flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {isCurrentlyMissing ? "Recovered / Restored Location" : "Last Known Location"}
            </label>
            <input
              type="text"
              className="field-input"
              placeholder={
                isCurrentlyMissing
                  ? "e.g., Workshop Shelf 2, Bay 1"
                  : "e.g., Electronics Bench, Testing Track"
              }
              value={lastKnownLocation}
              onChange={(e) => setLastKnownLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Circumstances / Explanation
            </label>
            <textarea
              rows={3}
              className="field-input resize-none"
              placeholder={
                isCurrentlyMissing
                  ? "e.g., Located in telemetry crate after dyno testing"
                  : "e.g., Unaccounted for after yesterday's chassis assembly session"
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {!isCurrentlyMissing && (
            <label className="flex items-start gap-2.5 rounded-lg border border-line bg-canvas/60 p-3 cursor-pointer hover:bg-canvas transition-colors">
              <input
                type="checkbox"
                checked={addToBuyList}
                onChange={(e) => setAddToBuyList(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-accent"
              />
              <div className="text-xs">
                <span className="font-semibold text-ink-900 flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-accent" />
                  Automatically add replacement to "To-Buy" list
                </span>
                <p className="text-ink-500 mt-0.5">
                  Creates an urgent procurement ticket so team leads can approve and order a replacement.
                </p>
              </div>
            </label>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={isCurrentlyMissing ? "btn-primary" : "btn-danger"}
            >
              {isSubmitting
                ? "Updating..."
                : isCurrentlyMissing
                ? "Mark as Recovered & Found"
                : "Confirm Missing"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
