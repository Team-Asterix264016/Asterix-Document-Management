import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, GraduationCap, Plus, Trash2, Calculator, AlertTriangle } from "lucide-react";
import { createIncomeEvent, updateIncomeEvent } from "../../../api/income";
import type { IncomeEvent, EventTier, EventStatus } from "../../../types/income";

interface EventModalProps {
  isOpen: boolean;
  eventToEdit: IncomeEvent | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EventModal({
  isOpen,
  eventToEdit,
  onClose,
  onSuccess,
}: EventModalProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sessionsCount, setSessionsCount] = useState<number>(1);
  const [isCancelled, setIsCancelled] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [tiers, setTiers] = useState<EventTier[]>([
    { tierName: "Standard Pass", pricePerParticipant: 500, registeredCount: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to compute status dynamically based on current date vs start/end dates
  function computeStatus(s: string, e: string, cancelled: boolean): EventStatus {
    if (cancelled) return "CANCELLED";
    if (!s) return "UPCOMING";
    const todayStr = new Date().toISOString().split("T")[0];
    const end = e || s;
    if (todayStr < s) return "UPCOMING";
    if (todayStr > end) return "COMPLETED";
    return "ONGOING";
  }

  const computedStatus = computeStatus(startDate, endDate, isCancelled);

  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setTitle(eventToEdit.title);
        const s = eventToEdit.startDate
          ? eventToEdit.startDate.split("T")[0]
          : eventToEdit.date
          ? eventToEdit.date.split("T")[0]
          : "";
        const e = eventToEdit.endDate ? eventToEdit.endDate.split("T")[0] : s;
        setStartDate(s);
        setEndDate(e);
        setSessionsCount(eventToEdit.sessionsCount || 1);
        setIsCancelled(eventToEdit.status === "CANCELLED");
        setLocation(eventToEdit.location || "");
        setDescription(eventToEdit.description || "");
        setTiers(
          eventToEdit.tiers && eventToEdit.tiers.length > 0
            ? eventToEdit.tiers.map((t) => ({ ...t }))
            : [{ tierName: "Standard Pass", pricePerParticipant: 500, registeredCount: 0 }]
        );
        setNotes(eventToEdit.notes || "");
      } else {
        const today = new Date().toISOString().split("T")[0];
        setTitle("");
        setStartDate(today);
        setEndDate(today);
        setSessionsCount(1);
        setIsCancelled(false);
        setLocation("");
        setDescription("");
        setTiers([
          { tierName: "Standard Pass", pricePerParticipant: 500, registeredCount: 0 },
        ]);
        setNotes("");
      }
      setError(null);
    }
  }, [isOpen, eventToEdit]);

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

  // Live dynamic calculations
  const totalRevenue = tiers.reduce(
    (sum, t) => sum + (Number(t.pricePerParticipant) || 0) * (Number(t.registeredCount) || 0),
    0
  );
  const totalParticipants = tiers.reduce(
    (sum, t) => sum + (Number(t.registeredCount) || 0),
    0
  );

  function handleAddTier() {
    setTiers([
      ...tiers,
      { tierName: `Tier ${tiers.length + 1}`, pricePerParticipant: 300, registeredCount: 0 },
    ]);
  }

  function handleRemoveTier(index: number) {
    if (tiers.length === 1) {
      setError("At least one pricing tier is required");
      return;
    }
    setTiers(tiers.filter((_, i) => i !== index));
  }

  function handleTierChange(
    index: number,
    field: keyof EventTier,
    value: string | number
  ) {
    const updated = [...tiers];
    if (field === "tierName") {
      updated[index].tierName = String(value);
    } else if (field === "pricePerParticipant") {
      updated[index].pricePerParticipant = Math.max(0, Number(value) || 0);
    } else if (field === "registeredCount") {
      updated[index].registeredCount = Math.max(0, Number(value) || 0);
    }
    setTiers(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide an event title");
      return;
    }
    if (!startDate) {
      setError("Please select the workshop start date");
      return;
    }
    if (!endDate) {
      setError("Please select the workshop end date");
      return;
    }
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setError("End date cannot be earlier than start date");
      return;
    }
    if (tiers.length === 0) {
      setError("At least one pricing tier is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const payload = {
        title: title.trim(),
        startDate,
        endDate,
        date: startDate,
        sessionsCount: Math.max(1, Number(sessionsCount) || 1),
        location: location.trim(),
        description: description.trim(),
        status: computedStatus,
        tiers,
        notes: notes.trim(),
      };

      if (eventToEdit) {
        await updateIncomeEvent(eventToEdit._id, payload);
      } else {
        await createIncomeEvent(payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save event";
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
        aria-labelledby="event-modal-title"
        className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto animate-scale-up p-6 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 id="event-modal-title" className="text-base font-bold text-ink-900">
                {eventToEdit ? "Edit Workshop / Event" : "Register Workshop / Event"}
              </h2>
              <p className="text-xs text-ink-500">
                Define workshop schedule (multi-day & sessions) with automatic status calculation
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
          <div>
            <label htmlFor="event-title" className="field-label">
              Event / Workshop Title *
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Autonomous Systems & ROS2 Workshop"
              required
              className="field-input mt-1"
            />
          </div>

          {/* Schedule: Multi-day & Sessions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="event-start-date" className="field-label">
                Start Date *
              </label>
              <input
                id="event-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setStartDate(newStart);
                  if (!endDate || new Date(endDate).getTime() < new Date(newStart).getTime()) {
                    setEndDate(newStart);
                  }
                }}
                required
                className="field-input mt-1"
              />
            </div>

            <div>
              <label htmlFor="event-end-date" className="field-label">
                End Date *
              </label>
              <input
                id="event-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="field-input mt-1"
              />
            </div>

            <div>
              <label htmlFor="event-sessions" className="field-label">
                Sessions / Modules Count
              </label>
              <input
                id="event-sessions"
                type="number"
                min="1"
                step="1"
                value={sessionsCount}
                onChange={(e) => setSessionsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="field-input mt-1"
                placeholder="e.g., 2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-location" className="field-label">
                Venue / Platform
              </label>
              <input
                id="event-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Offline in Mechanical Seminar Hall / Zoom"
                className="field-input mt-1"
              />
            </div>

            {/* Auto status badge & Cancel toggle */}
            <div>
              <label className="field-label">
                Event Status (Auto-Calculated)
              </label>
              <div className="mt-1 flex items-center justify-between rounded-md border border-line bg-canvas px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      computedStatus === "ONGOING"
                        ? "bg-amber-100 text-amber-800"
                        : computedStatus === "COMPLETED"
                        ? "bg-emerald-100 text-status-approved"
                        : computedStatus === "UPCOMING"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-ink-200 text-ink-600"
                    }`}
                  >
                    {computedStatus === "ONGOING" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    {computedStatus}
                  </span>
                  <span className="text-[11px] text-ink-500">
                    {computedStatus === "ONGOING"
                      ? "Happening now"
                      : computedStatus === "UPCOMING"
                      ? "Scheduled for future"
                      : computedStatus === "COMPLETED"
                      ? "Dates concluded"
                      : "Cancelled"}
                  </span>
                </div>

                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900">
                  <input
                    type="checkbox"
                    checked={isCancelled}
                    onChange={(e) => setIsCancelled(e.target.checked)}
                    className="rounded border-line text-status-rejected focus:ring-status-rejected"
                  />
                  <span>Mark Cancelled</span>
                </label>
              </div>
            </div>
          </div>

          {/* Pricing Tiers Section */}
          <div className="rounded-lg border border-line bg-canvas/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink-900">Pricing Tiers & Registrations</h3>
                <p className="text-[11px] text-ink-500">
                  Income calculates automatically from (Price × Registered Participants)
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTier}
                className="flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent hover:border-accent"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Tier
              </button>
            </div>

            <div className="space-y-2.5">
              {tiers.map((tier, idx) => {
                const subtotal = (Number(tier.pricePerParticipant) || 0) * (Number(tier.registeredCount) || 0);
                return (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface p-2.5"
                  >
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-[10px] font-medium text-ink-500">Tier Name</label>
                      <input
                        type="text"
                        value={tier.tierName}
                        onChange={(e) => handleTierChange(idx, "tierName", e.target.value)}
                        placeholder="e.g., Early Bird"
                        className="field-input !py-1 text-xs"
                        required
                      />
                    </div>

                    <div className="w-28">
                      <label className="text-[10px] font-medium text-ink-500">Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={tier.pricePerParticipant}
                        onChange={(e) =>
                          handleTierChange(idx, "pricePerParticipant", e.target.value)
                        }
                        className="field-input !py-1 text-xs font-semibold"
                        required
                      />
                    </div>

                    <div className="w-28">
                      <label className="text-[10px] font-medium text-ink-500">Participants</label>
                      <input
                        type="number"
                        min="0"
                        value={tier.registeredCount}
                        onChange={(e) =>
                          handleTierChange(idx, "registeredCount", e.target.value)
                        }
                        className="field-input !py-1 text-xs font-semibold"
                        required
                      />
                    </div>

                    <div className="min-w-[100px] text-right">
                      <span className="block text-[10px] font-medium text-ink-500">Subtotal</span>
                      <span className="text-xs font-bold text-accent">
                        ₹{subtotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {tiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(idx)}
                        className="mt-4 rounded p-1 text-ink-400 hover:text-status-rejected"
                        title="Remove Tier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dynamic Calculation Banner */}
            <div className="mt-4 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-status-approved">
                <Calculator className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{totalParticipants}</strong> registered participant{totalParticipants === 1 ? "" : "s"} across {tiers.length} tier{tiers.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-ink-500 mr-2">Calculated Income:</span>
                <span className="text-sm font-extrabold text-status-approved">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="event-notes" className="field-label">
              Notes / Coordinator Details
            </label>
            <input
              id="event-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Coordinated with SAE Collegiate Club; certificates issued"
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
              {isSubmitting ? "Saving..." : eventToEdit ? "Update Event" : "Register Event"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
