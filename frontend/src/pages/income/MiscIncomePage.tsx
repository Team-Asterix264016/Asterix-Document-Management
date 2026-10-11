import { useState, useEffect, useMemo } from "react";
import {
  WalletCards,
  Plus,
  Calendar,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getIncomeMisc, deleteIncomeMisc } from "../../api/income";
import { IncomeSubNav } from "../../components/income/IncomeSubNav";
import { Spinner } from "../../components/ui/Spinner";
import { MiscIncomeModal } from "../../components/income/modals/MiscIncomeModal";
import type { IncomeMisc, MiscCategory } from "../../types/income";

const CATEGORY_LABELS: Record<MiscCategory, { label: string; tone: string }> = {
  COLLEGE_GRANT: { label: "College Grant", tone: "bg-blue-50 text-blue-700" },
  PRIZE_MONEY: { label: "Prize Money", tone: "bg-purple-50 text-purple-700" },
  SCRAP_SALE: { label: "Scrap Sale", tone: "bg-amber-50 text-amber-700" },
  MERCHANDISE: { label: "Merchandise", tone: "bg-emerald-50 text-status-approved" },
  DONATION: { label: "Donation", tone: "bg-pink-50 text-pink-700" },
  OTHER: { label: "Miscellaneous", tone: "bg-ink-100 text-ink-700" },
};

export function MiscIncomePage() {
  const { data, loading, error, reload } = useAsync(() => getIncomeMisc(), []);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [miscToEdit, setMiscToEdit] = useState<IncomeMisc | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteIncomeMisc(id);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete entry");
    }
  }

  function handleOpenCreate() {
    setMiscToEdit(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(entry: IncomeMisc) {
    setMiscToEdit(entry);
    setIsModalOpen(true);
  }

  const items = data?.items ?? [];
  const summary = data?.summary;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.receivedBy && item.receivedBy.toLowerCase().includes(search.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
      if (!matchSearch) return false;

      if (filterCategory !== "ALL" && item.category !== filterCategory) return false;
      return true;
    });
  }, [items, search, filterCategory]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <IncomeSubNav />
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top sticky sub-nav */}
      <IncomeSubNav />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-status-approved">
              Miscellaneous
            </span>
            <span className="text-xs text-ink-500">
              {summary?.totalCount ?? 0} Recorded Inflows
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">Miscellaneous Inflow Log</h1>
          <p className="text-xs text-ink-500">
            Log ad-hoc income, college reimbursements, prize money, merchandise sales, and scrap sales
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleOpenCreate} className="btn-primary !px-3.5 !py-1.5 text-xs">
            <Plus className="h-4 w-4" />
            Record Inflow
          </button>
          <button
            onClick={() => reload()}
            className="btn-secondary !p-1.5 text-xs"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-status-rejected/30 bg-status-rejectedSoft p-4 text-xs text-status-rejected">
          Failed to load miscellaneous income: {error}
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <span className="text-xs font-medium text-ink-500">Total Miscellaneous Inflow</span>
          <p className="mt-1 text-2xl font-extrabold text-status-approved">
            ₹{(summary?.totalAmount ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">From grants, prize awards & scrap sales</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-ink-500">Number of Transactions</span>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">
            {summary?.totalCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Ad-hoc inflows logged into treasury</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-ink-500">Average Inflow Size</span>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">
            ₹{summary && summary.totalCount > 0 ? Math.round(summary.totalAmount / summary.totalCount).toLocaleString("en-IN") : "0"}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Per ad-hoc income record</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, receiver, notes..."
              className="field-input !py-1.5 !pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="field-input !py-1.5 text-xs font-semibold"
            >
              <option value="ALL">All Categories</option>
              <option value="COLLEGE_GRANT">College Grants</option>
              <option value="PRIZE_MONEY">Prize Money</option>
              <option value="SCRAP_SALE">Scrap Sales</option>
              <option value="MERCHANDISE">Merchandise</option>
              <option value="DONATION">Donations</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas text-[11px] font-semibold text-ink-500">
                <tr>
                  <th className="py-2.5 pl-3">Date</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Source / Description</th>
                  <th className="py-2.5">Payment Mode</th>
                  <th className="py-2.5">Received By</th>
                  <th className="py-2.5">Notes</th>
                  <th className="py-2.5 text-right">Amount (₹)</th>
                  <th className="py-2.5 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredItems.map((item) => {
                  const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.OTHER;

                  return (
                    <tr key={item._id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-2.5 pl-3 font-medium text-ink-600">
                        {new Date(item.dateReceived).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${cat.tone}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="py-2.5 font-semibold text-ink-900">{item.title}</td>
                      <td className="py-2.5 text-ink-600 font-mono text-[11px]">{item.paymentMode}</td>
                      <td className="py-2.5 text-ink-500">{item.receivedBy || "—"}</td>
                      <td className="py-2.5 text-ink-400 max-w-[200px] truncate">{item.notes || "—"}</td>
                      <td className="py-2.5 text-right font-bold text-status-approved">
                        +₹{item.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="rounded p-1 text-ink-400 hover:text-ink-700 hover:bg-surface"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id, item.title)}
                            className="rounded p-1 text-ink-400 hover:text-status-rejected hover:bg-status-rejectedSoft"
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
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <WalletCards className="h-8 w-8 text-ink-300" />
            <h3 className="mt-2 text-sm font-bold text-ink-900">No miscellaneous inflows logged</h3>
            <p className="mt-1 text-xs text-ink-500">
              Record ad-hoc team income, prize winnings, or scrap sales.
            </p>
            <button onClick={handleOpenCreate} className="btn-primary mt-3 !px-3.5 !py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Record Inflow
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <MiscIncomeModal
        isOpen={isModalOpen}
        miscToEdit={miscToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setMiscToEdit(null);
        }}
        onSuccess={() => reload()}
      />
    </div>
  );
}
