import { useState, useEffect } from "react";
import type { InventoryItem, CustodyAction } from "../../types";
import { updateCustody, getTeamMembers, type TeamMember } from "../../api/inventory";
import { useToast } from "../ui/Toast";
import { X, UserCheck, RotateCcw, ArrowRightLeft, Calendar, MapPin, FileText } from "lucide-react";

interface Props {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustodyModal({ isOpen, item, onClose, onSuccess }: Props) {
  const { push } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [action, setAction] = useState<CustodyAction>("CHECKOUT");
  const [assignedTo, setAssignedTo] = useState("");
  const [location, setLocation] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getTeamMembers()
        .then(setMembers)
        .catch(() => push("Failed to load team members", "error"));
    }
  }, [isOpen, push]);

  useEffect(() => {
    if (item) {
      if (item.status === "CHECKED_OUT") {
        setAction("CHECKIN");
        setAssignedTo("");
      } else {
        setAction("CHECKOUT");
        setAssignedTo("");
      }
      setLocation(item.location || "");
      setExpectedReturnDate("");
      setNotes("");
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action !== "CHECKIN" && !assignedTo) {
      push("Please select a team member", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCustody(item._id, {
        action,
        assignedTo: action === "CHECKIN" ? undefined : assignedTo,
        location: location.trim(),
        expectedReturnDate: expectedReturnDate || null,
        notes: notes.trim(),
      });

      const actionText =
        action === "CHECKOUT"
          ? "checked out"
          : action === "CHECKIN"
          ? "checked back in"
          : "transferred";
      push(`"${item.name}" successfully ${actionText}!`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Failed to update custody";
      push(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCheckedOut = item.status === "CHECKED_OUT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-card animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
              Custody Management
            </span>
            <h2 className="text-lg font-bold text-ink-900 line-clamp-1">{item.name}</h2>
            {item.partNumber && (
              <p className="text-xs font-mono text-ink-500">PN: {item.partNumber}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-canvas hover:text-ink-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current status overview */}
        <div className="mt-4 rounded-lg border border-line/60 bg-canvas/70 p-3 text-xs text-ink-700">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink-500">Current Status:</span>
            <span className="font-semibold text-ink-900">{item.status}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-medium text-ink-500">Current Location:</span>
            <span className="font-medium text-ink-800">{item.location}</span>
          </div>
          {isCheckedOut && item.assignedTo && (
            <div className="mt-1 flex items-center justify-between">
              <span className="font-medium text-ink-500">Currently with:</span>
              <span className="font-semibold text-indigo-700">
                {(item.assignedTo as any).displayName || (item.assignedTo as any).username}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Action toggle buttons */}
          <div>
            <label className="field-label">Select Action</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {isCheckedOut ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAction("CHECKIN")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all ${
                      action === "CHECKIN"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500"
                        : "border-line bg-surface text-ink-700 hover:bg-canvas"
                    }`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Return / Check In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction("TRANSFER")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all ${
                      action === "TRANSFER"
                        ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                        : "border-line bg-surface text-ink-700 hover:bg-canvas"
                    }`}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Transfer Holder
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setAction("CHECKOUT")}
                  className={`col-span-2 sm:col-span-3 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold transition-all ${
                    action === "CHECKOUT"
                      ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                      : "border-line bg-surface text-ink-700 hover:bg-canvas"
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  Check Out to Member
                </button>
              )}
            </div>
          </div>

          {/* Member Picker */}
          {action !== "CHECKIN" && (
            <div>
              <label className="field-label">
                {action === "TRANSFER" ? "Transfer To Member" : "Assign To Member"} *
              </label>
              <select
                className="field-input"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                required
              >
                <option value="">Select teammate...</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.displayName} ({m.username}) - {m.role}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="field-label flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {action === "CHECKIN" ? "Return Storage Location" : "Working / Desk Location"}
            </label>
            <input
              type="text"
              className="field-input"
              placeholder={
                action === "CHECKIN"
                  ? "e.g., Workshop Shelf 4, Electronics Rack B"
                  : "e.g., Dyno Testing Bay, Laptop Desk"
              }
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Expected Return Date */}
          {action !== "CHECKIN" && (
            <div>
              <label className="field-label flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expected Return Date (Optional)
              </label>
              <input
                type="date"
                className="field-input"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="field-label flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Notes / Purpose
            </label>
            <textarea
              rows={2}
              className="field-input resize-none"
              placeholder="e.g., Needed for suspension telemetry testing this weekend"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
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
              className="btn-primary"
            >
              {isSubmitting ? (
                "Processing..."
              ) : action === "CHECKIN" ? (
                "Confirm Return"
              ) : action === "TRANSFER" ? (
                "Transfer Custody"
              ) : (
                "Complete Check Out"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
