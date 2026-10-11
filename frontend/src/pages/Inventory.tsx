import { useState, useEffect, useCallback } from "react";
import type { InventoryItem, InventoryStats } from "../types";
import { listInventory, getInventoryStats, deleteInventoryItem } from "../api/inventory";
import { InventoryStatsCards } from "../components/inventory/InventoryStatsCards";
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
  LayoutGrid,
  List,
  MapPin,
  Users,
  User,
  AlertOctagon,
  Eye,
  Trash2,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Hash,
  Edit,
  X,
  ArrowUpDown,
  Filter,
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
type ViewMode = "compact" | "table" | "grid";

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
  const [viewMode, setViewMode] = useState<ViewMode>("compact");

  // Pagination & Page Size
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Mobile filters drawer / collapse
  const [showFilters, setShowFilters] = useState(false);

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

  const handleStatsFilter = (filterKey: string) => {
    if (filterKey === "TO_BUY") {
      setActiveTab("TO_BUY");
    } else if (filterKey === "MISSING") {
      setActiveTab("MISSING");
      setStatusFilter("ALL");
      setAssignedFilter("");
      setPage(1);
    } else if (filterKey === "ASSIGNED_ALL") {
      setActiveTab("ALL");
      setAssignedFilter("ALL");
      setStatusFilter("ALL");
      setPage(1);
    } else if (filterKey === "ASSIGNED_INDIVIDUAL") {
      setActiveTab("ALL");
      setAssignedFilter("INDIVIDUAL");
      setStatusFilter("ALL");
      setPage(1);
    } else {
      setActiveTab("ALL");
      setStatusFilter(filterKey);
      setAssignedFilter("");
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
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
              <Boxes className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-ink-900 tracking-tight">
                Inventory & Hardware
              </h1>
              <p className="text-xs text-ink-500 line-clamp-1">
                Fast workshop tracking for parts, locations, custody & restock
              </p>
            </div>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddToBuyModalOpen(true)}
            className="btn-secondary flex-1 sm:flex-initial py-1.5 px-3 text-xs"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-amber-700" />
            <span className="truncate">Add To-Buy</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
            className="btn-primary flex-1 sm:flex-initial py-1.5 px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="truncate">Add Component</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <InventoryStatsCards
        stats={stats}
        activeFilter={
          activeTab === "TO_BUY"
            ? "TO_BUY"
            : activeTab === "MISSING"
            ? "MISSING"
            : assignedFilter === "ALL"
            ? "ASSIGNED_ALL"
            : assignedFilter === "INDIVIDUAL"
            ? "ASSIGNED_INDIVIDUAL"
            : statusFilter
        }
        onSelectFilter={handleStatsFilter}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-line pb-0 overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setActiveTab("ALL");
            setPage(1);
          }}
          className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            activeTab === "ALL"
              ? "border-accent text-accent"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <Boxes className="h-3.5 w-3.5" />
          <span>All Components</span>
          {stats?.total !== undefined && (
            <span className="rounded-full bg-line px-1.5 py-0.2 text-[10px] text-ink-700 font-bold">
              {stats.total}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("MISSING");
            setPage(1);
          }}
          className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            activeTab === "MISSING"
              ? "border-rose-600 text-rose-700"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <AlertOctagon className="h-3.5 w-3.5" />
          <span>Missing Items</span>
          {stats?.missing ? (
            <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
              {stats.missing}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("TO_BUY")}
          className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
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

      {/* Main Tab Content */}
      {activeTab === "TO_BUY" ? (
        <ToBuyTab onOpenAddModal={() => setIsAddToBuyModalOpen(true)} />
      ) : (
        <div className="space-y-3">
          {/* Controls Bar: Search, Quick Filters & View Switcher */}
          <div className="rounded-xl border border-line bg-surface p-2.5 sm:p-3 shadow-subtle space-y-2.5">
            {/* Top row: Search input + View toggle + Mobile filter button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  placeholder="Quick search component, part #, location, category…"
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
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`sm:hidden flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  showFilters || hasActiveFilters
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-ink-700 hover:bg-canvas"
                }`}
                title="Filters"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-lg border border-line bg-canvas/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("compact")}
                  className={`rounded px-2 py-1 text-xs transition-colors flex items-center gap-1 ${
                    viewMode === "compact"
                      ? "bg-surface shadow-xs text-accent font-bold"
                      : "text-ink-500 hover:text-ink-800"
                  }`}
                  title="Compact Rows View (Fast & Scannable)"
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Compact</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`hidden sm:flex rounded px-2 py-1 text-xs transition-colors items-center gap-1 ${
                    viewMode === "table"
                      ? "bg-surface shadow-xs text-accent font-bold"
                      : "text-ink-500 hover:text-ink-800"
                  }`}
                  title="Detailed Table View"
                >
                  <span className="font-mono text-xs">≡</span>
                  <span className="hidden md:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded px-2 py-1 text-xs transition-colors flex items-center gap-1 ${
                    viewMode === "grid"
                      ? "bg-surface shadow-xs text-accent font-bold"
                      : "text-ink-500 hover:text-ink-800"
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Grid</span>
                </button>
              </div>
            </div>

            {/* Filter Dropdowns (Visible always on desktop, toggleable on mobile) */}
            <div
              className={`grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap sm:items-center ${
                showFilters ? "grid" : "hidden sm:flex"
              }`}
            >
              {/* Custody Filter */}
              {activeTab === "ALL" && (
                <select
                  className="field-input py-1 text-xs w-full sm:w-auto sm:min-w-[130px]"
                  value={assignedFilter}
                  onChange={(e) => {
                    setAssignedFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Custody</option>
                  <option value="ALL">👥 Shared (All)</option>
                  <option value="INDIVIDUAL">👤 Individual</option>
                </select>
              )}

              {/* Status Filter */}
              {activeTab === "ALL" && (
                <select
                  className="field-input py-1 text-xs w-full sm:w-auto sm:min-w-[120px]"
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
              )}

              {/* Sort Order */}
              <div className="flex items-center gap-1 w-full sm:w-auto">
                <select
                  className="field-input py-1 text-xs w-full sm:w-auto sm:min-w-[150px]"
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="updated_desc">🕒 Recently Updated</option>
                  <option value="name_asc">🔤 Name (A → Z)</option>
                  <option value="name_desc">🔤 Name (Z → A)</option>
                  <option value="stock_asc">📦 Stock: Low to High</option>
                  <option value="stock_desc">📦 Stock: High to Low</option>
                  <option value="location_asc">📍 Location (A → Z)</option>
                </select>
              </div>

              {/* Items per page */}
              <div className="flex items-center gap-1 w-full sm:w-auto sm:ml-auto">
                <span className="text-[11px] text-ink-400 hidden lg:inline">Per page:</span>
                <select
                  className="field-input py-1 text-xs w-full sm:w-auto"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={25}>25 items</option>
                  <option value={50}>50 items</option>
                  <option value={100}>100 items</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 rounded border border-rose-200 bg-rose-50/70 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Reset Filters
                </button>
              )}
            </div>

            {/* Horizontal Category Quick-Chips Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar border-t border-line/40">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("");
                  setPage(1);
                }}
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  categoryFilter === ""
                    ? "bg-accent text-white font-semibold"
                    : "bg-canvas text-ink-600 hover:bg-line hover:text-ink-900"
                }`}
              >
                All Categories
              </button>
              {CATEGORY_PRESETS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(categoryFilter === cat ? "" : cat);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    categoryFilter === cat
                      ? "bg-accent text-white font-semibold"
                      : "bg-canvas text-ink-600 hover:bg-line hover:text-ink-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quick results count header */}
          <div className="flex items-center justify-between px-1 text-xs text-ink-500">
            <span>
              Showing <strong className="text-ink-900">{items.length}</strong> of{" "}
              <strong className="text-ink-900">{totalCount}</strong> items
              {categoryFilter && ` in "${categoryFilter}"`}
            </span>
            {loading && <span className="text-accent animate-pulse">Refreshing…</span>}
          </div>

          {/* Empty State */}
          {!loading && items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface p-8 sm:p-12 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-ink-900">
                {activeTab === "MISSING"
                  ? "No components currently marked missing"
                  : "No components match your search filters"}
              </h3>
              <p className="mt-1 text-xs text-ink-500">
                {activeTab === "MISSING"
                  ? "All tracked hardware is accounted for in workshop storage."
                  : "Try clearing search or filters to see more components."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="btn-secondary mt-3 text-xs"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : viewMode === "compact" ? (
            /* COMPACT ROWS VIEW (High Density, Super Fast & Mobile Friendly) */
            <div className="divide-y divide-line/60 rounded-xl border border-line bg-surface shadow-subtle overflow-hidden">
              {items.map((item) => {
                const isItemMissing = item.status === "MISSING" || item.missingDetails?.isMissing;
                const isLowStock = item.quantity <= 1;

                return (
                  <div
                    key={item._id}
                    className={`group flex items-center justify-between gap-3 p-2.5 sm:px-4 sm:py-2.5 hover:bg-canvas/50 transition-colors ${
                      isItemMissing ? "bg-rose-50/30" : ""
                    }`}
                  >
                    {/* Main item clickable area: triggers details */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setDetailsModalItemId(item._id)}
                    >
                      {/* Top Line: Name, Part #, Stock, Status */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-ink-900 truncate">
                          {item.name}
                        </span>

                        {item.partNumber && (
                          <span className="hidden sm:inline font-mono text-[10px] text-ink-400 bg-canvas px-1.5 py-0.5 rounded">
                            #{item.partNumber}
                          </span>
                        )}

                        <span
                          className={`shrink-0 rounded px-1.5 py-0.2 text-[11px] font-bold tabular-nums ${
                            isItemMissing
                              ? "bg-rose-100 text-rose-700"
                              : isLowStock
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.quantity} {item.unit}
                        </span>

                        <div className="shrink-0 hidden xs:block">
                          <InventoryStatusBadge status={item.status} size="sm" />
                        </div>
                      </div>

                      {/* Bottom Line: Category, Location, Custodian */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
                        {item.category && (
                          <span className="flex items-center gap-1 font-medium text-ink-700">
                            <Layers className="h-3 w-3 text-accent shrink-0" />
                            <span className="truncate max-w-[130px]">{item.category}</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-ink-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{item.location}</span>
                        </span>

                        <span className="flex items-center gap-1">
                          {item.assignedToAll ? (
                            <Users className="h-3 w-3 text-emerald-600 shrink-0" />
                          ) : (
                            <User className="h-3 w-3 text-indigo-600 shrink-0" />
                          )}
                          <span
                            className={`truncate max-w-[130px] font-medium ${
                              isItemMissing
                                ? "text-rose-600 font-bold"
                                : item.assignedToAll
                                ? "text-emerald-700"
                                : "text-indigo-700"
                            }`}
                          >
                            {isItemMissing
                              ? "Reported Missing"
                              : item.assignedToAll
                              ? "Shared"
                              : item.assignedTo
                              ? (item.assignedTo as any).displayName || (item.assignedTo as any).username
                              : "Shared"}
                          </span>
                        </span>

                        <div className="xs:hidden">
                          <InventoryStatusBadge status={item.status} size="sm" />
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsAddModalOpen(true);
                        }}
                        className="rounded p-1.5 text-ink-500 hover:text-ink-900 hover:bg-canvas transition-colors"
                        title="Edit component"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setMissingModalItem(item)}
                        className={`rounded p-1.5 transition-colors ${
                          isItemMissing
                            ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            : "text-ink-400 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                        title={isItemMissing ? "Mark Recovered" : "Report Missing"}
                      >
                        <AlertOctagon className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailsModalItemId(item._id)}
                        className="rounded p-1.5 text-ink-400 hover:text-accent hover:bg-canvas transition-colors hidden sm:block"
                        title="View details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item._id, item.name)}
                        className="rounded p-1.5 text-ink-300 hover:text-rose-600 hover:bg-canvas transition-colors"
                        title="Delete component"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === "table" ? (
            /* DETAILED SPREADSHEET TABLE VIEW */
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-canvas/80 font-bold uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-3.5 py-2.5">Component</th>
                      <th className="px-3.5 py-2.5">Category</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">Location</th>
                      <th className="px-3.5 py-2.5">Custodian</th>
                      <th className="px-3.5 py-2.5">Stock</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {items.map((item) => {
                      const isItemMissing = item.status === "MISSING" || item.missingDetails?.isMissing;

                      return (
                        <tr
                          key={item._id}
                          className={`hover:bg-canvas/50 transition-colors cursor-pointer ${
                            isItemMissing ? "bg-rose-50/30" : ""
                          }`}
                          onClick={() => setDetailsModalItemId(item._id)}
                        >
                          <td className="px-3.5 py-2.5">
                            <span className="font-bold text-ink-900 block">{item.name}</span>
                            {item.partNumber && (
                              <span className="font-mono text-[10px] text-ink-400">
                                #{item.partNumber}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-ink-700">
                            {item.category || "General"}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <InventoryStatusBadge status={item.status} size="sm" />
                          </td>
                          <td className="px-3.5 py-2.5 text-ink-800">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-ink-400" />
                              {item.location}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`font-semibold ${
                                isItemMissing
                                  ? "text-rose-700 font-bold"
                                  : item.assignedToAll
                                  ? "text-emerald-700"
                                  : "text-indigo-700"
                              }`}
                            >
                              {isItemMissing
                                ? "Reported Missing"
                                : item.assignedToAll
                                ? "All (Shared)"
                                : item.assignedTo
                                ? (item.assignedTo as any).displayName || (item.assignedTo as any).username
                                : "Shared"}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-bold tabular-nums text-ink-900">
                            {item.quantity} {item.unit}
                          </td>
                          <td
                            className="px-3.5 py-2.5 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsAddModalOpen(true);
                                }}
                                className="rounded p-1 text-ink-500 hover:text-ink-900 hover:bg-canvas"
                                title="Edit"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMissingModalItem(item)}
                                className="rounded p-1 text-ink-400 hover:text-rose-700 hover:bg-canvas"
                                title={isItemMissing ? "Mark Recovered" : "Report Missing"}
                              >
                                <AlertOctagon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item._id, item.name)}
                                className="rounded p-1 text-ink-300 hover:text-rose-600 hover:bg-canvas"
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
          ) : (
            /* CONCISE CARDS GRID VIEW */
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const isItemMissing = item.status === "MISSING" || item.missingDetails?.isMissing;

                return (
                  <div
                    key={item._id}
                    className={`group flex flex-col justify-between rounded-xl border bg-surface p-3.5 shadow-subtle transition-all duration-200 hover:shadow-card cursor-pointer ${
                      isItemMissing
                        ? "border-rose-300 ring-1 ring-rose-300/40"
                        : "border-line"
                    }`}
                    onClick={() => setDetailsModalItemId(item._id)}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <InventoryStatusBadge status={item.status} size="sm" />
                        <span className="font-bold text-xs tabular-nums text-ink-900 bg-canvas px-2 py-0.5 rounded">
                          {item.quantity} {item.unit}
                        </span>
                      </div>

                      {/* Title & Part # */}
                      <div className="mt-2">
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
                      <div className="mt-2.5 space-y-1 rounded-lg border border-line/60 bg-canvas/60 p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-ink-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-ink-400" />
                            Location:
                          </span>
                          <span className="font-semibold text-ink-800 truncate max-w-[160px]">
                            {item.location}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-ink-500 flex items-center gap-1">
                            {item.assignedToAll ? (
                              <Users className="h-3 w-3 text-ink-400" />
                            ) : (
                              <User className="h-3 w-3 text-ink-400" />
                            )}
                            Custodian:
                          </span>
                          <span
                            className={`font-semibold truncate max-w-[160px] ${
                              isItemMissing
                                ? "text-rose-700 font-bold"
                                : item.assignedToAll
                                ? "text-emerald-700"
                                : "text-indigo-700"
                            }`}
                          >
                            {isItemMissing
                              ? "Reported Missing"
                              : item.assignedToAll
                              ? "Shared (All)"
                              : item.assignedTo
                              ? (item.assignedTo as any).displayName || (item.assignedTo as any).username
                              : "Shared (All)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div
                      className="mt-3 flex items-center justify-between border-t border-line/70 pt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[11px] text-ink-500 flex items-center gap-1 truncate max-w-[150px]">
                        <Layers className="h-3 w-3 text-accent shrink-0" />
                        {item.category || "General"}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setIsAddModalOpen(true);
                          }}
                          className="rounded p-1 text-ink-500 hover:text-ink-900 hover:bg-canvas"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMissingModalItem(item)}
                          className={`rounded p-1 ${
                            isItemMissing
                              ? "text-emerald-700"
                              : "text-ink-400 hover:text-rose-700"
                          }`}
                          title={isItemMissing ? "Mark Recovered" : "Report Missing"}
                        >
                          <AlertOctagon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item._id, item.name)}
                          className="rounded p-1 text-ink-300 hover:text-rose-600 hover:bg-canvas"
                          title="Delete"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-line/40">
              <span className="text-xs text-ink-500">
                Page <strong className="text-ink-900">{page}</strong> of{" "}
                <strong className="text-ink-900">{totalPages}</strong> ({totalCount} total items)
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
      />
    </div>
  );
}
