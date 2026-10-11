import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { InventoryItem } from "../../types";
import { getInventoryItem } from "../../api/inventory";
import { InventoryStatusBadge } from "./InventoryStatusBadge";
import { format } from "date-fns";
import {
  X,
  MapPin,
  Users,
  User,
  Layers,
  History,
  AlertOctagon,
  ArrowRight,
  Package,
  Edit,
  Trash2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  itemId: string | null;
  onClose: () => void;
  onOpenEdit: (item: InventoryItem) => void;
  onOpenMissing: (item: InventoryItem) => void;
  onDelete?: (id: string, name: string) => void;
}

export function ItemDetailsModal({
  isOpen,
  itemId,
  onClose,
  onOpenEdit,
  onOpenMissing,
  onDelete,
}: Props) {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (isOpen && itemId) {
      setLoading(true);
      getInventoryItem(itemId)
        .then(setItem)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setItem(null);
    }
  }, [isOpen, itemId]);

  if (!isOpen) return null;

  const isMissing = item?.status === "MISSING" || item?.missingDetails?.isMissing;

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
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-line bg-surface shadow-card animate-fade-up"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-ink-900">{item?.name || "Component Details"}</h2>
                {item && <InventoryStatusBadge status={item.status} size="sm" />}
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-500 mt-0.5">
                {item?.partNumber && <span className="font-mono">PN: {item.partNumber}</span>}
                <span className="flex items-center gap-1 font-medium text-ink-700">
                  <Layers className="h-3 w-3 text-accent" />
                  Category: {item?.category || "General"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-canvas hover:text-ink-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-ink-500">Loading details...</div>
          ) : !item ? (
            <div className="py-12 text-center text-sm text-ink-500">Component not found</div>
          ) : (
            <>
              {/* Missing Alert Banner */}
              {isMissing && (
                <div className="rounded-lg border border-rose-300 bg-rose-50/70 p-4 text-xs text-rose-900">
                  <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                    <AlertOctagon className="h-4 w-4" />
                    Component Currently Flagged Missing
                  </div>
                  <div className="mt-2 space-y-1 text-rose-700">
                    {item.missingDetails?.reportedAt && (
                      <p>
                        Reported on:{" "}
                        <span className="font-semibold">
                          {format(new Date(item.missingDetails.reportedAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </p>
                    )}
                    {item.missingDetails?.reportedBy && (
                      <p>
                        Reported by:{" "}
                        <span className="font-semibold">
                          {(item.missingDetails.reportedBy as any).displayName ||
                            (item.missingDetails.reportedBy as any).username}
                        </span>
                      </p>
                    )}
                    {item.missingDetails?.lastKnownLocation && (
                      <p>
                        Last seen at:{" "}
                        <span className="font-semibold">{item.missingDetails.lastKnownLocation}</span>
                      </p>
                    )}
                    {item.missingDetails?.notes && (
                      <p className="italic bg-white/60 p-2 rounded mt-1 text-rose-900">
                        "{item.missingDetails.notes}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-canvas/60 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                    Quantity
                  </span>
                  <p className="mt-1 text-sm font-bold text-ink-900">
                    {item.quantity} {item.unit}
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-canvas/60 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Where It Is
                  </span>
                  <p className="mt-1 text-sm font-semibold text-ink-900 line-clamp-1">
                    {item.location}
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-canvas/60 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 flex items-center gap-1">
                    {item.assignedToAll ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    Assigned Custody
                  </span>
                  <p className="mt-1 text-sm font-semibold line-clamp-1 text-indigo-700">
                    {item.assignedToAll
                      ? "All Members (Shared)"
                      : item.assignedTo
                      ? (item.assignedTo as any).displayName || (item.assignedTo as any).username
                      : "All Members (Shared)"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <div className="rounded-lg border border-line/60 bg-surface p-3 text-xs">
                  <span className="font-semibold text-ink-700 block mb-1">Specifications & Description:</span>
                  <p className="text-ink-600 leading-relaxed whitespace-pre-line">{item.description}</p>
                </div>
              )}

              {/* Activity History */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-ink-500" />
                    <h3 className="text-sm font-bold text-ink-900">Activity & Assignment History</h3>
                  </div>
                  <span className="text-xs text-ink-400">
                    {item.history?.length || 0} event{item.history?.length === 1 ? "" : "s"}
                  </span>
                </div>

                {(!item.history || item.history.length === 0) ? (
                  <p className="text-xs text-ink-400 italic py-2">No history recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                    {item.history
                      .slice()
                      .reverse()
                      .map((h, i) => (
                        <div key={h._id || i} className="relative text-xs">
                          <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full border border-surface bg-ink-300 ring-2 ring-surface">
                            <span className="h-1.5 w-1.5 rounded-full bg-surface" />
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="font-semibold text-ink-900 flex items-center gap-1.5">
                              {h.action.replace("_", " ")}
                              {h.user && (
                                <span className="font-normal text-indigo-700 flex items-center gap-0.5">
                                  <ArrowRight className="h-3 w-3" />
                                  {(h.user as any).displayName || (h.user as any).username}
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-ink-400">
                              {format(new Date(h.timestamp), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                          {h.location && (
                            <p className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" /> {h.location}
                            </p>
                          )}
                          {h.notes && (
                            <p className="text-ink-600 mt-1 italic bg-canvas/70 p-1.5 rounded text-[11px]">
                              {h.notes}
                            </p>
                          )}
                          <p className="text-[10px] text-ink-400 mt-0.5">
                            Logged by: {(h.performedBy as any).displayName || (h.performedBy as any).username}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {item && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-canvas/40 p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMissing(item);
                }}
                className={isMissing ? "btn-secondary text-xs" : "btn-secondary text-rose-700 hover:border-rose-300 text-xs"}
              >
                <AlertOctagon className="h-3.5 w-3.5" />
                {isMissing ? "Mark Recovered" : "Report Missing"}
              </button>

              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(item._id, item.name);
                  }}
                  className="btn-ghost text-xs text-status-rejected hover:bg-status-rejectedSoft"
                  title="Delete component"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEdit(item);
              }}
              className="btn-primary text-xs"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Component
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
