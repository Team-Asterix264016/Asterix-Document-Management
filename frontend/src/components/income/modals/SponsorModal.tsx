import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Award, AlertTriangle } from "lucide-react";
import { createIncomeSponsor, updateIncomeSponsor } from "../../../api/income";
import type { IncomeSponsor, SponsorTier, SponsorStatus } from "../../../types/income";

interface SponsorModalProps {
  isOpen: boolean;
  sponsorToEdit: IncomeSponsor | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SponsorModal({
  isOpen,
  sponsorToEdit,
  onClose,
  onSuccess,
}: SponsorModalProps) {
  const [sponsorName, setSponsorName] = useState("");
  const [tier, setTier] = useState<SponsorTier>("SILVER");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<SponsorStatus>("RECEIVED");
  const [dateReceived, setDateReceived] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (sponsorToEdit) {
        setSponsorName(sponsorToEdit.sponsorName);
        setTier(sponsorToEdit.tier || "SILVER");
        setAmount(String(sponsorToEdit.amount));
        setStatus(sponsorToEdit.status || "RECEIVED");
        setDateReceived(sponsorToEdit.dateReceived ? sponsorToEdit.dateReceived.split("T")[0] : "");
        setContactPerson(sponsorToEdit.contactPerson || "");
        setContactEmail(sponsorToEdit.contactEmail || "");
        setDeliverables(sponsorToEdit.deliverables || "");
        setNotes(sponsorToEdit.notes || "");
      } else {
        setSponsorName("");
        setTier("SILVER");
        setAmount("");
        setStatus("RECEIVED");
        setDateReceived(new Date().toISOString().split("T")[0]);
        setContactPerson("");
        setContactEmail("");
        setDeliverables("");
        setNotes("");
      }
      setError(null);
    }
  }, [isOpen, sponsorToEdit]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!sponsorName.trim()) {
      setError("Please provide a sponsor name");
      return;
    }
    if (isNaN(numAmount) || numAmount < 0) {
      setError("Please provide a valid sponsor amount");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const payload = {
        sponsorName: sponsorName.trim(),
        tier,
        amount: numAmount,
        status,
        dateReceived: dateReceived || new Date().toISOString(),
        contactPerson: contactPerson.trim(),
        contactEmail: contactEmail.trim(),
        deliverables: deliverables.trim(),
        notes: notes.trim(),
      };

      if (sponsorToEdit) {
        await updateIncomeSponsor(sponsorToEdit._id, payload);
      } else {
        await createIncomeSponsor(payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save sponsor";
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
        aria-labelledby="sponsor-modal-title"
        className="card w-full max-w-lg animate-scale-up p-6 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 id="sponsor-modal-title" className="text-base font-bold text-ink-900">
                {sponsorToEdit ? "Edit Sponsorship" : "Add Sponsor / Funding Partner"}
              </h2>
              <p className="text-xs text-ink-500">Record corporate, alumni, or equipment sponsor</p>
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
            <label htmlFor="sponsor-name" className="field-label">
              Sponsor / Company Name *
            </label>
            <input
              id="sponsor-name"
              type="text"
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              placeholder="e.g., Ansys, SolidWorks, TATA Steel, Alumni Class of '20"
              required
              className="field-input mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sponsor-tier" className="field-label">
                Sponsorship Tier
              </label>
              <select
                id="sponsor-tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as SponsorTier)}
                className="field-input mt-1"
              >
                <option value="TITLE">Title Sponsor</option>
                <option value="PLATINUM">Platinum Tier</option>
                <option value="GOLD">Gold Tier</option>
                <option value="SILVER">Silver Tier</option>
                <option value="TECHNICAL">Technical Partner</option>
                <option value="MATERIAL">In-Kind / Material</option>
                <option value="OTHER">Other Partner</option>
              </select>
            </div>

            <div>
              <label htmlFor="sponsor-amount" className="field-label">
                Amount (₹) *
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-ink-400">
                  ₹
                </span>
                <input
                  id="sponsor-amount"
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  required
                  className="field-input !pl-8 font-semibold text-ink-900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sponsor-status" className="field-label">
                Funding Status
              </label>
              <select
                id="sponsor-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as SponsorStatus)}
                className="field-input mt-1"
              >
                <option value="RECEIVED">Received in Account</option>
                <option value="PLEDGED">Pledged / Agreement Signed</option>
              </select>
            </div>

            <div>
              <label htmlFor="sponsor-date" className="field-label">
                Date Received / Pledged
              </label>
              <input
                id="sponsor-date"
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="field-input mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sponsor-contact" className="field-label">
                Contact Person (Optional)
              </label>
              <input
                id="sponsor-contact"
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g., Regional HR / CSR Lead"
                className="field-input mt-1"
              />
            </div>

            <div>
              <label htmlFor="sponsor-email" className="field-label">
                Email / Phone (Optional)
              </label>
              <input
                id="sponsor-email"
                type="text"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@sponsor.com"
                className="field-input mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sponsor-deliverables" className="field-label">
              Deliverables / Branding Terms
            </label>
            <input
              id="sponsor-deliverables"
              type="text"
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              placeholder="e.g., Logo on nose cone, livery banner, resume access"
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
              {isSubmitting ? "Saving..." : sponsorToEdit ? "Update Sponsor" : "Add Sponsor"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
