import { useState, useEffect, useMemo } from "react";
import {
  Award,
  Plus,
  Calendar,
  User,
  Mail,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getIncomeSponsors, deleteIncomeSponsor } from "../../api/income";
import { IncomeSubNav } from "../../components/income/IncomeSubNav";
import { Spinner } from "../../components/ui/Spinner";
import { SponsorModal } from "../../components/income/modals/SponsorModal";
import type { IncomeSponsor, SponsorTier, SponsorStatus } from "../../types/income";

const TIER_COLORS: Record<SponsorTier, string> = {
  TITLE: "bg-purple-100 text-purple-800 border-purple-200",
  PLATINUM: "bg-slate-100 text-slate-800 border-slate-300",
  GOLD: "bg-amber-100 text-amber-800 border-amber-300",
  SILVER: "bg-zinc-100 text-zinc-700 border-zinc-300",
  TECHNICAL: "bg-blue-100 text-blue-800 border-blue-200",
  MATERIAL: "bg-emerald-100 text-emerald-800 border-emerald-200",
  OTHER: "bg-ink-100 text-ink-700 border-ink-200",
};

export function SponsorsPage() {
  const { data, loading, error, reload } = useAsync(() => getIncomeSponsors(), []);

  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sponsorToEdit, setSponsorToEdit] = useState<IncomeSponsor | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await deleteIncomeSponsor(id);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete sponsor");
    }
  }

  function handleOpenCreate() {
    setSponsorToEdit(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(sponsor: IncomeSponsor) {
    setSponsorToEdit(sponsor);
    setIsModalOpen(true);
  }

  const sponsors = data?.items ?? [];
  const summary = data?.summary;

  const filteredSponsors = useMemo(() => {
    return sponsors.filter((s) => {
      const matchSearch =
        s.sponsorName.toLowerCase().includes(search.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase()));
      if (!matchSearch) return false;

      if (filterTier !== "ALL" && s.tier !== filterTier) return false;
      if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
      return true;
    });
  }, [sponsors, search, filterTier, filterStatus]);

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
            <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Sponsorships
            </span>
            <span className="text-xs text-ink-500">
              {summary?.totalSponsors ?? 0} Funding Partners
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">Sponsorship Directory</h1>
          <p className="text-xs text-ink-500">
            Track corporate, alumni, and technical partners across tiers and funding statuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleOpenCreate} className="btn-primary !px-3.5 !py-1.5 text-xs">
            <Plus className="h-4 w-4" />
            Add Sponsor
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
          Failed to load sponsors: {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <span className="text-xs font-medium text-ink-500">Total Received Funding</span>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">
            ₹{(summary?.totalReceived ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Secured in team account</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-ink-500">Total Pledged / Promised</span>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">
            ₹{(summary?.totalPledged ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Agreements signed or pending release</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-ink-500">Total Corporate & Alumni Partners</span>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">
            {summary?.totalSponsors ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Active sponsors supporting season '27</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sponsor or POC..."
              className="field-input !py-1.5 !pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="field-input !py-1.5 text-xs font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="PLEDGED">Pledged</option>
            </select>

            {/* Tier Filter */}
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="field-input !py-1.5 text-xs font-semibold"
            >
              <option value="ALL">All Tiers</option>
              <option value="TITLE">Title</option>
              <option value="PLATINUM">Platinum</option>
              <option value="GOLD">Gold</option>
              <option value="SILVER">Silver</option>
              <option value="TECHNICAL">Technical</option>
              <option value="MATERIAL">In-Kind</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sponsors Directory Grid */}
      {filteredSponsors.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSponsors.map((sponsor) => (
            <div key={sponsor._id} className="card flex flex-col justify-between p-5">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink-900">{sponsor.sponsorName}</h3>
                      <span
                        className={`inline-block mt-0.5 rounded border px-2 py-0.5 text-[10px] font-bold ${
                          TIER_COLORS[sponsor.tier] || "bg-ink-100 text-ink-700"
                        }`}
                      >
                        {sponsor.tier}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      sponsor.status === "RECEIVED"
                        ? "bg-emerald-50 text-status-approved"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {sponsor.status}
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-[11px] text-ink-500">Funding Amount:</span>
                  <p className="text-xl font-extrabold text-ink-900">
                    ₹{sponsor.amount.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-ink-600 border-t border-line pt-3">
                  {sponsor.contactPerson && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <User className="h-3.5 w-3.5 text-ink-400" />
                      <span>{sponsor.contactPerson}</span>
                    </div>
                  )}
                  {sponsor.contactEmail && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Mail className="h-3.5 w-3.5 text-ink-400" />
                      <span>{sponsor.contactEmail}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(sponsor.dateReceived).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {sponsor.deliverables && (
                    <p className="mt-2 text-[11px] text-ink-500 rounded bg-canvas p-2">
                      <strong>Terms:</strong> {sponsor.deliverables}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  onClick={() => handleOpenEdit(sponsor)}
                  className="flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-surface-hover"
                >
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(sponsor._id, sponsor.sponsorName)}
                  className="rounded-md border border-line bg-surface p-1 text-ink-400 hover:text-status-rejected hover:bg-status-rejectedSoft"
                  title="Delete sponsor"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <Award className="h-10 w-10 text-ink-300" />
          <h3 className="mt-2 text-sm font-bold text-ink-900">No sponsors found</h3>
          <p className="mt-1 text-xs text-ink-500">
            Record corporate sponsorships, grants, or equipment donations.
          </p>
          <button onClick={handleOpenCreate} className="btn-primary mt-4 !px-4 !py-2 text-xs">
            <Plus className="h-4 w-4" />
            Add First Sponsor
          </button>
        </div>
      )}

      {/* Modal */}
      <SponsorModal
        isOpen={isModalOpen}
        sponsorToEdit={sponsorToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setSponsorToEdit(null);
        }}
        onSuccess={() => reload()}
      />
    </div>
  );
}
