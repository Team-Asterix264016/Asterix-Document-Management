import { useState, useEffect, useCallback, useMemo } from "react";
import type { InventoryItem, InventoryStats } from "../types";
import { listInventory, getInventoryStats, deleteInventoryItem } from "../api/inventory";
import { InventoryStatusBadge } from "../components/inventory/InventoryStatusBadge";
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
  AlertOctagon,
  ChevronRight,
  ShoppingCart,
  X,
  Filter,
  ChevronLeft,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CATEGORY_PRESETS = [
  "Fasteners & Hardware",
  "Sensors & DAQ",
  "Electronics & Wiring",
  "Tools & Instruments",
  "Powertrain & Drivetrain",
  "Suspension & Steering",
  "Brakes & Hydraulics",
  "Chassis & Safety",
  "Raw Materials",
  "Other",
];

type ActiveTab = "ALL" | "MISSING" | "TO_BUY";

export function Inventory() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("ALL");
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortOption, setSortOption] = useState("updated_desc");

  // Pagination & Page Size
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Mobile filters panel toggle
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isAddToBuyModalOpen, setIsAddToBuyModalOpen] = useState(false);
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

  const fetchItems = useCallback(async () => {
    if (activeTab === "TO_BUY") return;
    setLoading(true);

    try {
      const isMissingTab = activeTab === "MISSING";
      const res = await listInventory({
        q: searchQuery.trim() || undefined,
        status: isMissingTab ? "MISSING" : statusFilter === "ALL" ? undefined : statusFilter,
        assignedTo: assignedFilter || undefined,
        isMissing: isMissingTab ? true : undefined,
        category: categoryFilter || undefined,
        sort: sortOption,
        page,
        limit,
      });

      setItems(res.items);
      setTotalPages(res.pages);
      setTotalCount(res.total);
    } catch {
      push("Failed to load inventory items", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, statusFilter, assignedFilter, categoryFilter, sortOption, page, limit, push]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;
    try {
      await deleteInventoryItem(id);
      push(`"${name}" deleted`, "info");
      fetchItems();
      fetchStats();
    } catch {
      push("Failed to delete component", "error");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setAssignedFilter("");
    setCategoryFilter("");
    setSortOption("updated_desc");
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    assignedFilter !== "" ||
    categoryFilter !== "" ||
    sortOption !== "updated_desc";

  return (
    <div className="flex flex-col gap-3 sm:gap-4 max-w-5xl mx-auto">
      {/* Top Header: Title & Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-ink-900 tracking-tight truncate">
            Inventory & Hardware
          </h1>
          <p className="text-xs text-ink-500 hidden sm:block">
            Track workshop components, storage locations, and custody
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddToBuyModalOpen(true)}
            className="btn-secondary py-1.5 px-2.5 text-xs"
            title="Add item to procurement list"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-amber-700" />
            <span className="hidden xs:inline">To-Buy</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
            className="btn-primary py-1.5 px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar: Clean & Minimal */}
      <div className="flex items-center justify-between border-b border-line pb-0">
        <div className="flex items-center gap-1 sm:gap-3">
          <button
            onClick={() => {
              setActiveTab("ALL");
              setPage(1);
            }}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "ALL"
                ? "border-accent text-accent"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>All Items</span>
            {stats?.total !== undefined && (
              <span className="rounded-full bg-line px-1.5 py-0.2 text-[10px] text-ink-600 font-bold">
                {stats.total}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("MISSING");
              setPage(1);
            }}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "MISSING"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Missing</span>
            {stats?.missing ? (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
                {stats.missing}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("TO_BUY")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "TO_BUY"
                ? "border-amber-600 text-amber-800"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>To-Buy List</span>
            {stats?.toBuyPending ? (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                {stats.toBuyPending}
              </span>
            ) : null}
          </button>
        </div>

        {/* Collapsible Stats Toggle */}
        {stats && (
          <button
            type="button"
            onClick={() => setShowStats(!showStats)}
            className="text-[11px] text-ink-500 hover:text-ink-800 hidden md:flex items-center gap-1 py-1 px-2 rounded hover:bg-canvas"
          >
            <span>Overview stats</span>
            {showStats ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Optional Collapsible Stats Ribbon (Clean & unobtrusive) */}
      {showStats && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-3 rounded-lg border border-line bg-surface text-xs animate-fade-in">
          <div>
            <span className="text-[10px] text-ink-400 uppercase font-medium">Total</span>
            <p className="text-base font-bold text-ink-900">{stats.total}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 uppercase font-medium">Shared</span>
            <p className="text-base font-bold text-emerald-700">{stats.assignedAll}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 uppercase font-medium">Individual</span>
            <p className="text-base font-bold text-indigo-700">{stats.assignedIndividual}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 uppercase font-medium">On Vehicle</span>
            <p className="text-base font-bold text-sky-700">{stats.installed}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 uppercase font-medium">Missing</span>
            <p className="text-base font-bold text-rose-700">{stats.missing}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 uppercase font-medium">To Buy</span>
            <p className="text-base font-bold text-amber-700">{stats.toBuyPending}</p>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "TO_BUY" ? (
        <ToBuyTab onOpenAddModal={() => setIsAddToBuyModalOpen(true)} />
      ) : (
        <div className="space-y-2.5">
          {/* Streamlined Search & Filter Row */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  placeholder="Search item, part #, location…"
                  className="field-input pl-8 pr-7 py-1.5 text-xs w-full"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                    title="Clear"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filters Toggle Button */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  showFilters || hasActiveFilters
                    ? "border-accent bg-accent/10 text-accent font-semibold"
                    : "border-line bg-surface text-ink-700 hover:bg-canvas"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </button>
            </div>

            {/* Filter Dropdowns (Clean Collapsible Panel) */}
            {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-line bg-surface p-3 text-xs animate-fade-in">
                {activeTab === "ALL" && (
                  <div>
                    <label className="text-[10px] font-semibold text-ink-500 uppercase">Status</label>
                    <select
                      className="field-input py-1 text-xs mt-1 w-full"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="INSTALLED">On Vehicle</option>
                      <option value="MISSING">Missing</option>
                      <option value="DAMAGED">Damaged</option>
                    </select>
                  </div>
                )}

                {activeTab === "ALL" && (
                  <div>
                    <label className="text-[10px] font-semibold text-ink-500 uppercase">Custody</label>
                    <select
                      className="field-input py-1 text-xs mt-1 w-full"
                      value={assignedFilter}
                      onChange={(e) => {
                        setAssignedFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">All Custody</option>
                      <option value="ALL">Shared (All)</option>
                      <option value="INDIVIDUAL">Individual</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-semibold text-ink-500 uppercase">Sort By</label>
                  <select
                    className="field-input py-1 text-xs mt-1 w-full"
                    value={sortOption}
                    onChange={(e) => {
                      setSortOption(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="updated_desc">Recently Updated</option>
                    <option value="name_asc">Name (A → Z)</option>
                    <option value="name_desc">Name (Z → A)</option>
                    <option value="stock_asc">Stock: Low to High</option>
                    <option value="stock_desc">Stock: High to Low</option>
                    <option value="location_asc">Location (A → Z)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="btn-secondary w-full py-1 text-xs text-rose-700 hover:border-rose-300"
                    >
                      Reset Filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="btn-secondary w-full py-1 text-xs"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Horizontal Category Chips Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("");
                  setPage(1);
                }}
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                  categoryFilter === ""
                    ? "bg-ink-900 text-white font-medium"
                    : "bg-surface border border-line text-ink-600 hover:bg-canvas"
                }`}
              >
                All
              </button>
              {CATEGORY_PRESETS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(categoryFilter === cat ? "" : cat);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                    categoryFilter === cat
                      ? "bg-ink-900 text-white font-medium"
                      : "bg-surface border border-line text-ink-600 hover:bg-canvas"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count Line */}
          <div className="flex items-center justify-between px-0.5 text-[11px] text-ink-400">
            <span>
              {totalCount} {totalCount === 1 ? "component" : "components"}
              {categoryFilter && ` in ${categoryFilter}`}
            </span>
            {loading && <span className="text-accent animate-pulse">Loading…</span>}
          </div>

          {/* Empty State */}
          {!loading && items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
              <Boxes className="h-8 w-8 mx-auto text-ink-300" />
              <h3 className="mt-2 text-sm font-semibold text-ink-900">
                {activeTab === "MISSING"
                  ? "No components currently marked missing"
                  : "No components found"}
              </h3>
              <p className="mt-0.5 text-xs text-ink-500">
                {hasActiveFilters ? "Try clearing search or filters" : "Add components to your inventory"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="btn-secondary mt-3 py-1 px-3 text-xs"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            /* ULTRA-CLEAN, SIMPLIFIED COMPONENT LIST */
            <div className="rounded-xl border border-line bg-surface shadow-subtle overflow-hidden divide-y divide-line/60">
              {items.map((item) => {
                const isItemMissing = item.status === "MISSING" || item.missingDetails?.isMissing;
                const isInstalled = item.status === "INSTALLED";
                const isDamaged = item.status === "DAMAGED";
                const custodianName = item.assignedToAll
                  ? "Shared"
                  : typeof item.assignedTo === "object" && item.assignedTo
                  ? item.assignedTo.displayName || item.assignedTo.username
                  : "Shared";

                return (
                  <div
                    key={item._id}
                    onClick={() => setDetailsModalItemId(item._id)}
                    className={`group flex items-center justify-between gap-3 p-3 sm:px-4 sm:py-3 hover:bg-canvas/50 cursor-pointer transition-colors ${
                      isItemMissing ? "bg-rose-50/30" : ""
                    }`}
                  >
                    {/* Left: Name & Metadata */}
                    <div className="min-w-0 flex-1">
                      {/* Line 1: Title and Part # */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs sm:text-sm text-ink-900 truncate">
                          {item.name}
                        </span>
                        {item.partNumber && (
                          <span className="font-mono text-[10px] text-ink-400 shrink-0">
                            #{item.partNumber}
                          </span>
                        )}
                      </div>

                      {/* Line 2: Clean Metadata without icon clutter */}
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500 truncate">
                        {item.category && (
                          <span className="text-ink-600 truncate">{item.category}</span>
                        )}
                        {item.category && item.location && <span className="text-ink-300">·</span>}
                        {item.location && <span className="truncate">{item.location}</span>}
                        {(item.category || item.location) && <span className="text-ink-300">·</span>}
                        <span
                          className={`truncate ${
                            isItemMissing
                              ? "text-rose-600 font-semibold"
                              : "text-ink-600 font-medium"
                          }`}
                        >
                          {isItemMissing ? "Missing" : custodianName}
                        </span>
                      </div>
                    </div>

                    {/* Right: Status Alert (if not available) + Quantity + Arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Non-available alert badge only */}
                      {isItemMissing && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          Missing
                        </span>
                      )}
                      {isInstalled && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                          On Vehicle
                        </span>
                      )}
                      {isDamaged && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Damaged
                        </span>
                      )}

                      {/* Stock Quantity */}
                      <span className="font-medium text-xs text-ink-800 bg-canvas px-2 py-0.5 rounded border border-line/60 tabular-nums">
                        {item.quantity} {item.unit}
                      </span>

                      {/* Subtle chevron */}
                      <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-ink-600 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 text-xs text-ink-500">
              <span>
                Page {page} of {totalPages}
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
        initialItem={editingItem}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
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
        onOpenEdit={(item) => {
          setEditingItem(item);
          setIsAddModalOpen(true);
        }}
        onOpenMissing={(item) => setMissingModalItem(item)}
        onDelete={handleDeleteItem}
      />
    </div>
  );
}
