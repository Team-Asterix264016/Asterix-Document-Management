import { useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  Calendar,
  MapPin,
  Users,
  Edit2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getIncomeEvents, deleteIncomeEvent } from "../../api/income";
import { IncomeSubNav } from "../../components/income/IncomeSubNav";
import { Spinner } from "../../components/ui/Spinner";
import { EventModal } from "../../components/income/modals/EventModal";
import type { IncomeEvent } from "../../types/income";

export function EventsPage() {
  const { data, loading, error, reload } = useAsync(() => getIncomeEvents(), []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<IncomeEvent | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteIncomeEvent(id);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete event");
    }
  }

  function handleOpenCreate() {
    setEventToEdit(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(event: IncomeEvent) {
    setEventToEdit(event);
    setIsModalOpen(true);
  }

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

  const events = data?.items ?? [];
  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-6">
      {/* Top sticky sub-nav */}
      <IncomeSubNav />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Workshops & Events
            </span>
            <span className="text-xs text-ink-500">
              {summary?.totalEvents ?? 0} Events Registered
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">Workshops & Technical Events</h1>
          <p className="text-xs text-ink-500">
            Multi-tier pricing structures with dynamic attendee headcount calculations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleOpenCreate} className="btn-primary !px-3.5 !py-1.5 text-xs">
            <Plus className="h-4 w-4" />
            Register Event
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
          Failed to load workshops: {error}
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <span className="text-xs font-medium text-ink-500">Total Workshop Revenue</span>
          <p className="mt-1 text-2xl font-extrabold text-blue-700">
            ₹{(summary?.totalRevenue ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Dynamically calculated from participant tiers</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-ink-500">Total Registered Participants</span>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">
            {summary?.totalParticipants ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Across all organized workshops</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-ink-500">Average Revenue Per Event</span>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">
            ₹{summary && summary.totalEvents > 0 ? Math.round(summary.totalRevenue / summary.totalEvents).toLocaleString("en-IN") : "0"}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Per technical session / workshop</p>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event._id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-ink-900">{event.title}</h3>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        event.status === "COMPLETED"
                          ? "bg-emerald-50 text-status-approved"
                          : event.status === "UPCOMING"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-ink-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(event.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {event.totalParticipants} attendees
                    </span>
                  </div>

                  {event.description && (
                    <p className="mt-2 text-xs text-ink-600">{event.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(event)}
                    className="flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-surface-hover"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Tiers
                  </button>
                  <button
                    onClick={() => handleDelete(event._id, event.title)}
                    className="rounded-md border border-line bg-surface p-1.5 text-ink-400 hover:text-status-rejected hover:bg-status-rejectedSoft"
                    title="Delete event"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Tiers Table */}
              <div className="mt-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-line bg-canvas text-[11px] font-semibold text-ink-500">
                      <tr>
                        <th className="py-2 pl-3">Pricing Tier</th>
                        <th className="py-2">Price Per Head (₹)</th>
                        <th className="py-2">Registered Headcount</th>
                        <th className="py-2 pr-3 text-right">Computed Subtotal (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {event.tiers.map((tier, idx) => {
                        const subtotal = tier.pricePerParticipant * tier.registeredCount;
                        return (
                          <tr key={tier._id || idx} className="hover:bg-surface-hover">
                            <td className="py-2 pl-3 font-semibold text-ink-900">
                              {tier.tierName}
                            </td>
                            <td className="py-2 font-medium text-ink-600">
                              ₹{tier.pricePerParticipant.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2">
                              <span className="rounded bg-canvas px-2 py-0.5 font-bold text-ink-800">
                                {tier.registeredCount} participants
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-right font-bold text-accent">
                              ₹{subtotal.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Event Computed Summary Footer */}
                <div className="mt-3 flex items-center justify-between rounded-md border border-line bg-canvas p-3 text-xs">
                  <span className="font-semibold text-ink-600">
                    Total: <strong>{event.totalParticipants}</strong> participants across {event.tiers.length} tier{event.tiers.length === 1 ? "" : "s"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-500">Dynamically Calculated Revenue:</span>
                    <span className="text-sm font-extrabold text-status-approved">
                      ₹{event.totalRevenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {event.notes && (
                  <p className="mt-2 text-[11px] text-ink-400 italic">
                    Note: {event.notes}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card flex flex-col items-center justify-center p-12 text-center">
            <GraduationCap className="h-10 w-10 text-ink-300" />
            <h3 className="mt-2 text-sm font-bold text-ink-900">No workshops registered yet</h3>
            <p className="mt-1 text-xs text-ink-500">
              Register technical workshops, configure ticket pricing tiers, and track revenue automatically.
            </p>
            <button
              onClick={handleOpenCreate}
              className="btn-primary mt-4 !px-4 !py-2 text-xs"
            >
              <Plus className="h-4 w-4" />
              Register First Event
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <EventModal
        isOpen={isModalOpen}
        eventToEdit={eventToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setEventToEdit(null);
        }}
        onSuccess={() => reload()}
      />
    </div>
  );
}
