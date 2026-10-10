import { useState, useEffect, useCallback } from "react";
import type { InventoryItem, InventoryStats, Subsystem } from "../types";
import { listInventory, getInventoryStats, deleteInventoryItem } from "../api/inventory";
import { listSubsystems } from "../api/subsystems";
import { InventoryStatsCards } from "../components/inventory/InventoryStatsCards";
import { InventoryStatusBadge } from "../components/inventory/InventoryStatusBadge";
import { CustodyModal } from "../components/inventory/CustodyModal";
import { MissingModal } from "../components/inventory/MissingModal";
import { AddComponentModal } from "../components/inventory/AddComponentModal";
import { ItemDetailsModal } from "../components/inventory/ItemDetailsModal";
import { AddToBuyModal } from "../components/inventory/AddToBuyModal";
import { ToBuyTab } from "../components/inventory/ToBuyTab";
import { useToast } from "../components/ui/Toast";
import {
  Boxes,
  Search,
  Plus,
  LayoutGrid,
  List,
  MapPin,
  UserCheck,
  AlertOctagon,
  Eye,
  Trash2,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShoppingCart,
  Hash,
} from "lucide-react";

type ActiveTab = "ALL" | "MISSING" | "TO_BUY";

export function Inventory() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("ALL");
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [subsystemFilter, setSubsystemFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddToBuyModalOpen, setIsAddToBuyModalOpen] = useState(false);
  const [custodyModalItem, setCustodyModalItem] = useState<InventoryItem | null>(null);
  const [missingModalItem, setMissingModalItem] = useState<InventoryItem | null>(null);
  const [detailsModalItemId, setDetailsModalItemId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const s = await getInventoryStats();
      setStats(s);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchSubsystems = useCallback(async () => {
    try {
      const subs = await listSubsystems();
      setSubsystems(subs);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchItems = useCallback(async () => {
    if (activeTab === "TO_BUY") return;
    setLoading(true);

    try {
      const isMissingTab = activeTab === "MISSING";
      const res = await listInventory({
        q: searchQuery.trim() || undefined,
        status: isMissingTab ? "MISSING" : statusFilter === "ALL" ? undefined : statusFilter,
        isMissing: isMissingTab ? true : undefined,
        subsystem: subsystemFilter || undefined,
        category: categoryFilter || undefined,
        page,
        limit: 24,
      });

      setItems(res.items);
      setTotalPages(res.pages);
      setTotalCount(res.total);
    } catch {
      push("Failed to load inventory items", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, statusFilter, subsystemFilter, categoryFilter, page, push]);

  useEffect(() => {
    fetchStats();
    fetchSubsystems();
  }, [fetchStats, fetchSubsystems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleStatsFilter = (filterKey: string) => {
    if (filterKey === "TO_BUY") {
      setActiveTab("TO_BUY");
    } else if (filterKey === "MISSING") {
      setActiveTab("MISSING");
      setStatusFilter("ALL");
      setPage(1);
    } else {
      setActiveTab("ALL");
      setStatusFilter(filterKey);
      setPage(1);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;
    try {
      await deleteInventoryItem(id);
      push(`"${name}" deleted successfully`, "info");
      fetchItems();
      fetchStats();
    } catch {
      push("Failed to delete component", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink-900 tracking-tight">
                Inventory & Hardware Hub
              </h1>
              <p className="text-xs text-ink-500">
                Track workshop components, member custody, missing parts, and restock tickets
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddToBuyModalOpen(true)}
            className="btn-secondary text-xs"
          >
            <ShoppingCart className="h-4 w-4 text-amber-700" />
            Add To-Buy Item
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary text-xs"
          >
            <Plus className="h-4 w-4" />
            Add Component
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <InventoryStatsCards
        stats={stats}
        activeFilter={activeTab === "TO_BUY" ? "TO_BUY" : activeTab === "MISSING" ? "MISSING" : statusFilter}
        onSelectFilter={handleStatsFilter}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-0">
        <button
          onClick={() => {
            setActiveTab("ALL");
            setPage(1);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "ALL"
              ? "border-accent text-accent"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <Boxes className="h-4 w-4" />
          All Components
          {stats?.total !== undefined && (
            <span className="rounded-full bg-line px-1.5 py-0.5 text-[10px] text-ink-700">
              {stats.total}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("MISSING");
            setPage(1);
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "MISSING"
              ? "border-rose-600 text-rose-700"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <AlertOctagon className="h-4 w-4" />
          Missing Items
          {stats?.missing ? (
            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
              {stats.missing}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("TO_BUY")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "TO_BUY"
              ? "border-amber-600 text-amber-800"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          To-Buy List
          {stats?.toBuyPending ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              {stats.toBuyPending}
            </span>
          ) : null}
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === "TO_BUY" ? (
        <ToBuyTab onOpenAddModal={() => setIsAddToBuyModalOpen(true)} />
      ) : (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <input
                  type="text"
                  placeholder="Search name, part #, location…"
                  className="field-input pl-9 py-1.5 text-xs"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Status Filter (only on ALL tab) */}
              {activeTab === "ALL" && (
                <select
                  className="field-input py-1.5 text-xs w-auto sm:max-w-[150px]"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                  <option value="INSTALLED">On Vehicle</option>
                  <option value="MISSING">Missing</option>
                  <option value="DAMAGED">Damaged</option>
                </select>
              )}

              {/* Subsystem Filter */}
              <select
                className="field-input py-1.5 text-xs w-auto sm:max-w-[160px]"
                value={subsystemFilter}
                onChange={(e) => {
                  setSubsystemFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Subsystems</option>
                {subsystems.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border-t border-line/60 pt-2 sm:border-t-0 sm:pt-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded p-1.5 text-xs transition-colors ${
                  viewMode === "grid"
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-ink-400 hover:bg-canvas hover:text-ink-700"
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded p-1.5 text-xs transition-colors ${
                  viewMode === "table"
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-ink-400 hover:bg-canvas hover:text-ink-700"
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Component Grid or Table */}
          {loading ? (
            <div className="py-16 text-center text-sm text-ink-500">
              Loading workshop components...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Boxes className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-ink-900">
                {activeTab === "MISSING"
                  ? "Great news! No components currently missing"
                  : "No components match your search"}
              </h3>
              <p className="mt-1 text-xs text-ink-500">
                {activeTab === "MISSING"
                  ? "All tracked hardware is accounted for in workshop storage or checked out."
                  : "Try clearing filters or add your first component."}
              </p>
              {activeTab === "ALL" && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="btn-primary mt-4 text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Add First Component
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const isItemMissing = item.status === "MISSING" || item.missingDetails?.isMissing;
                const isCheckedOut = item.status === "CHECKED_OUT";

                return (
                  <div
                    key={item._id}
                    className={`group relative flex flex-col justify-between rounded-xl border bg-surface p-4 shadow-subtle transition-all duration-200 hover:shadow-card ${
                      isItemMissing
                        ? "border-rose-300 ring-1 ring-rose-300/40"
                        : "border-line"
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <InventoryStatusBadge status={item.status} size="sm" />
                        {item.subsystem && (
                          <span className="flex items-center gap-1 rounded-md bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-700">
                            <Layers className="h-3 w-3 text-accent" />
                            {(item.subsystem as any).name || item.subsystem}
                          </span>
                        )}
                      </div>

                      {/* Title & Part # */}
                      <div className="mt-2.5">
                        <h3 className="text-sm font-bold text-ink-900 leading-snug line-clamp-1">
                          {item.name}
                        </h3>
                        {item.partNumber && (
                          <p className="text-[11px] font-mono text-ink-500 mt-0.5 flex items-center gap-1">
                            <Hash className="h-2.5 w-2.5" />
                            {item.partNumber}
                          </p>
                        )}
                      </div>

                      {/* Location & Custody Box */}
                      <div className="mt-3 space-y-1.5 rounded-lg border border-line/60 bg-canvas/60 p-2.5 text-xs">
                        {/* Location */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-ink-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-ink-400" />
                            Location:
                          </span>
                          <span className="font-semibold text-ink-800 line-clamp-1 max-w-[170px]">
                            {item.location}
                          </span>
                        </div>

                        {/* Who has it */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-ink-500 flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-ink-400" />
                            Custodian:
                          </span>
                          <span
                            className={`font-semibold line-clamp-1 max-w-[170px] ${
                              isItemMissing
                                ? "text-rose-700"
                                : isCheckedOut
                                ? "text-indigo-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {isItemMissing
                              ? "Lost / Missing"
                              : isCheckedOut && item.assignedTo
                              ? (item.assignedTo as any).displayName || (item.assignedTo as any).username
                              : "In Storage"}
                          </span>
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[11px] font-medium text-ink-500">In Stock:</span>
                          <span className="font-bold text-ink-900">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      </div>

                      {/* Missing alert message */}
                      {isItemMissing && item.missingDetails?.notes && (
                        <p className="mt-2 line-clamp-1 text-[11px] text-rose-700 italic bg-rose-50 p-1.5 rounded">
                          "{item.missingDetails.notes}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        {/* Custody action */}
                        <button
                          type="button"
                          onClick={() => setCustodyModalItem(item)}
                          className="rounded-lg border border-line bg-canvas/80 px-2.5 py-1 text-xs font-semibold text-ink-800 hover:bg-canvas hover:border-ink-400 transition-colors"
                        >
                          {isCheckedOut ? "Return / Move" : "Check Out"}
                        </button>

                        {/* Mark Missing toggle */}
                        <button
                          type="button"
                          onClick={() => setMissingModalItem(item)}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                            isItemMissing
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              : "border-line text-ink-500 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                          }`}
                          title={isItemMissing ? "Mark Recovered" : "Report Missing"}
                        >
                          <AlertOctagon className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Details Modal */}
                        <button
                          type="button"
                          onClick={() => setDetailsModalItemId(item._id)}
                          className="rounded p-1 text-ink-400 hover:text-ink-800 hover:bg-canvas transition-colors"
                          title="View Timeline & Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item._id, item.name)}
                          className="rounded p-1 text-ink-300 hover:text-rose-600 hover:bg-canvas transition-colors"
                          title="Delete Component"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-canvas/80 font-bold uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-4 py-3">Component</th>
                      <th className="px-4 py-3">Subsystem</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Where It Is</th>
                      <th className="px-4 py-3">Who Has It</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {items.map((item) => {
                      const isItemMissing = item.status === "MISSING" || item.missingDetails?.isMissing;
                      const isCheckedOut = item.status === "CHECKED_OUT";

                      return (
                        <tr key={item._id} className="hover:bg-canvas/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-ink-900 block">{item.name}</span>
                            {item.partNumber && (
                              <span className="font-mono text-[10px] text-ink-400">
                                {item.partNumber}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.subsystem ? (
                              <span className="font-medium text-ink-700">
                                {(item.subsystem as any).name || item.subsystem}
                              </span>
                            ) : (
                              <span className="text-ink-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <InventoryStatusBadge status={item.status} size="sm" />
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-ink-800">
                              <MapPin className="h-3 w-3 text-ink-400" />
                              {item.location}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold ${
                                isItemMissing
                                  ? "text-rose-700 font-bold"
                                  : isCheckedOut
                                  ? "text-indigo-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {isItemMissing
                                ? "Reported Missing"
                                : isCheckedOut && item.assignedTo
                                ? (item.assignedTo as any).displayName || (item.assignedTo as any).username
                                : "In Storage"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink-900">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCustodyModalItem(item)}
                                className="rounded border border-line px-2 py-0.5 font-semibold text-ink-700 hover:bg-canvas"
                              >
                                {isCheckedOut ? "Return" : "Check Out"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setMissingModalItem(item)}
                                className="rounded p-1 text-ink-400 hover:text-rose-700"
                                title={isItemMissing ? "Mark Recovered" : "Report Missing"}
                              >
                                <AlertOctagon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDetailsModalItemId(item._id)}
                                className="rounded p-1 text-ink-400 hover:text-ink-800"
                                title="Details & Timeline"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item._id, item.name)}
                                className="rounded p-1 text-ink-300 hover:text-rose-600"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-ink-500">
                Showing {items.length} of {totalCount} items
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <span className="text-xs font-semibold px-2 text-ink-700">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddComponentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchItems();
          fetchStats();
        }}
      />

      <AddToBuyModal
        isOpen={isAddToBuyModalOpen}
        onClose={() => setIsAddToBuyModalOpen(false)}
        onSuccess={() => {
          fetchStats();
        }}
      />

      <CustodyModal
        isOpen={!!custodyModalItem}
        item={custodyModalItem}
        onClose={() => setCustodyModalItem(null)}
        onSuccess={() => {
          fetchItems();
          fetchStats();
        }}
      />

      <MissingModal
        isOpen={!!missingModalItem}
        item={missingModalItem}
        onClose={() => setMissingModalItem(null)}
        onSuccess={() => {
          fetchItems();
          fetchStats();
        }}
      />

      <ItemDetailsModal
        isOpen={!!detailsModalItemId}
        itemId={detailsModalItemId}
        onClose={() => setDetailsModalItemId(null)}
        onOpenCustody={(item) => setCustodyModalItem(item)}
        onOpenMissing={(item) => setMissingModalItem(item)}
      />
    </div>
  );
}
