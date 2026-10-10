import { useState, useEffect, useCallback } from "react";
import type { ToBuyItem, ToBuyStatus, ToBuyPriority, Subsystem } from "../../types";
import { listToBuy, updateToBuy, deleteToBuy } from "../../api/toBuy";
import { listSubsystems } from "../../api/subsystems";
import { PriorityBadge } from "./PriorityBadge";
import { useToast } from "../ui/Toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ShoppingCart,
  Plus,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Truck,
  IndianRupee,
  Layers,
  Receipt,
  AlertOctagon,
  Clock,
  Sparkles,
} from "lucide-react";

interface Props {
  onOpenAddModal: () => void;
}

const STATUS_TABS: Array<{ value: ToBuyStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All Items" },
  { value: "PENDING", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "ORDERED", label: "Ordered / In Transit" },
  { value: "PURCHASED", label: "Received / Purchased" },
];

export function ToBuyTab({ onOpenAddModal }: Props) {
  const { push } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<ToBuyItem[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [subsystemFilter, setSubsystemFilter] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [toBuyRes, subRes] = await Promise.all([
        listToBuy({
          status: statusFilter === "ALL" ? undefined : statusFilter,
          priority: priorityFilter === "ALL" ? undefined : priorityFilter,
          subsystem: subsystemFilter || undefined,
        }),
        listSubsystems(),
      ]);
      setItems(toBuyRes.items);
      setSubsystems(subRes);
    } catch {
      push("Failed to load procurement list", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, subsystemFilter, push]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (id: string, newStatus: ToBuyStatus) => {
    try {
      await updateToBuy(id, { status: newStatus });
      push(`Item marked as ${newStatus.toLowerCase()}!`, "success");
      loadData();
    } catch {
      push("Failed to update status", "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the To-Buy list?`)) return;
    try {
      await deleteToBuy(id);
      push(`"${name}" removed from To-Buy list`, "info");
      loadData();
    } catch {
      push("Failed to delete item", "error");
    }
  };

  const totalEstimatedSpend = items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-ink-900">Procurement & To-Buy Board</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-ink-500">
            Track components to order, missing part replacements, and convert purchases to expense bills
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-subtle">
            <IndianRupee className="h-3.5 w-3.5 text-accent" />
            <span>Est. Spend: </span>
            <span className="font-bold text-ink-900">₹{totalEstimatedSpend.toLocaleString("en-IN")}</span>
          </div>

          <button
            onClick={onOpenAddModal}
            className="btn-primary text-xs"
          >
            <Plus className="h-4 w-4" />
            Add To-Buy Item
          </button>
        </div>
      </div>

      {/* Filter and Status Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-ink-900 text-white shadow-xs"
                  : "bg-surface border border-line text-ink-600 hover:bg-canvas"
              }`}
            >
              {tab.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          {/* Priority filter */}
          <select
            className="field-input py-1 text-xs"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Subsystem filter */}
          <select
            className="field-input py-1 text-xs"
            value={subsystemFilter}
            onChange={(e) => setSubsystemFilter(e.target.value)}
          >
            <option value="">All Subsystems</option>
            {subsystems.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-ink-500">Loading procurement items...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-ink-900">No items on this procurement list</h3>
          <p className="mt-1 text-xs text-ink-500">
            Components flagged as missing or new hardware requests will appear here.
          </p>
          <button
            onClick={onOpenAddModal}
            className="btn-secondary mt-4 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isPurchased = item.status === "PURCHASED";
            const isMissingReplacement = !!item.sourceInventoryItem;

            return (
              <div
                key={item._id}
                className={`group relative flex flex-col justify-between rounded-xl border bg-surface p-4 shadow-subtle transition-all duration-200 hover:shadow-card ${
                  item.priority === "URGENT"
                    ? "border-red-300 ring-1 ring-red-400/30"
                    : "border-line"
                }`}
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2">
                    <PriorityBadge priority={item.priority} />
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        item.status === "PURCHASED"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "ORDERED"
                          ? "bg-indigo-100 text-indigo-800"
                          : item.status === "APPROVED"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Title & Info */}
                  <div className="mt-2.5">
                    <h3 className="text-sm font-bold text-ink-900 leading-snug line-clamp-2">
                      {item.itemName}
                    </h3>

                    {/* Source missing warning badge */}
                    {isMissingReplacement && (
                      <div className="mt-1.5 flex items-center gap-1 rounded bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-800 border border-rose-200">
                        <AlertOctagon className="h-3 w-3 text-rose-600 shrink-0" />
                        <span>Replacement for missing: {(item.sourceInventoryItem as any).name}</span>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                      {item.subsystem && (
                        <span className="flex items-center gap-1 font-medium text-ink-700">
                          <Layers className="h-3 w-3 text-accent" />
                          {(item.subsystem as any).name || item.subsystem}
                        </span>
                      )}
                      <span>
                        Qty: <strong className="text-ink-800">{item.quantity} {item.unit}</strong>
                      </span>
                      {item.estimatedCost > 0 && (
                        <span className="font-semibold text-ink-900">
                          ₹{item.estimatedCost.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="mt-2 line-clamp-2 text-xs text-ink-600 italic bg-canvas/60 p-2 rounded">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom details and actions */}
                <div className="mt-4 pt-3 border-t border-line/70">
                  <div className="flex items-center justify-between text-[11px] text-ink-400 mb-2.5">
                    <span>Requested by: {(item.requestedBy as any).displayName || (item.requestedBy as any).username}</span>
                    {item.supplierUrl && (
                      <a
                        href={item.supplierUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-semibold text-accent hover:underline"
                      >
                        Vendor Link
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-1.5">
                    {/* Status updater */}
                    <div className="flex items-center gap-1">
                      {item.status === "PENDING" && (
                        <button
                          onClick={() => handleStatusChange(item._id, "APPROVED")}
                          className="flex items-center gap-1 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </button>
                      )}
                      {item.status === "APPROVED" && (
                        <button
                          onClick={() => handleStatusChange(item._id, "ORDERED")}
                          className="flex items-center gap-1 rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors"
                        >
                          <Truck className="h-3 w-3" />
                          Mark Ordered
                        </button>
                      )}
                      {item.status === "ORDERED" && (
                        <button
                          onClick={() => handleStatusChange(item._id, "PURCHASED")}
                          className="flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Mark Received
                        </button>
                      )}
                      {isPurchased && (
                        <button
                          onClick={() => navigate("/bills/new")}
                          className="flex items-center gap-1 rounded border border-accent bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors"
                        >
                          <Receipt className="h-3 w-3" />
                          Claim Bill
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(item._id, item.itemName)}
                      className="rounded p-1 text-ink-300 hover:bg-canvas hover:text-rose-600 transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
