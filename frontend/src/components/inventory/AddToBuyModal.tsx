import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createToBuy } from "../../api/toBuy";
import { listSubsystems } from "../../api/subsystems";
import type { Subsystem, ToBuyPriority } from "../../types";
import { useToast } from "../ui/Toast";
import { X, ShoppingCart, Layers, ExternalLink, IndianRupee, Flame } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddToBuyModal({ isOpen, onClose, onSuccess }: Props) {
  const { push } = useToast();
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [itemName, setItemName] = useState("");
  const [subsystemId, setSubsystemId] = useState("");
  const [category, setCategory] = useState("General");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [priority, setPriority] = useState<ToBuyPriority>("MEDIUM");
  const [supplierUrl, setSupplierUrl] = useState("");
  const [suggestedVendor, setSuggestedVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (isOpen) {
      listSubsystems()
        .then(setSubsystems)
        .catch(() => push("Failed to load subsystems", "error"));
    }
  }, [isOpen, push]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      push("Item name is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await createToBuy({
        itemName: itemName.trim(),
        subsystem: (subsystemId || undefined) as any,
        category: category.trim(),
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        unit: unit.trim(),
        estimatedCost: Math.max(0, parseFloat(estimatedCost) || 0),
        priority,
        supplierUrl: supplierUrl.trim(),
        suggestedVendor: suggestedVendor.trim(),
        notes: notes.trim(),
      });

      push(`"${itemName}" added to To-Buy list!`, "success");
      onSuccess();
      onClose();
      setItemName("");
      setEstimatedCost("");
      setNotes("");
      setSupplierUrl("");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Failed to add to-buy item";
      push(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-card animate-fade-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">Add Item to Buy</h2>
              <p className="text-xs text-ink-500">Submit procurement request for workshop or vehicle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-canvas hover:text-ink-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="field-label flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              Item Name *
            </label>
            <input
              type="text"
              required
              className="field-input"
              placeholder="e.g., M8 12.9 High Tensile Cap Screws (Pack of 50)"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Subsystem
              </label>
              <select
                className="field-input"
                value={subsystemId}
                onChange={(e) => setSubsystemId(e.target.value)}
              >
                <option value="">Select Subsystem...</option>
                {subsystems.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label flex items-center gap-1">
                <Flame className="h-3 w-3" />
                Priority Level
              </label>
              <select
                className="field-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ToBuyPriority)}
              >
                <option value="LOW">Low (Nice to have)</option>
                <option value="MEDIUM">Medium (Upcoming milestone)</option>
                <option value="HIGH">High (Active fabrication)</option>
                <option value="URGENT">Urgent (Vehicle halted / Missing part)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label">Quantity</label>
              <input
                type="number"
                min="1"
                className="field-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Unit</label>
              <input
                type="text"
                className="field-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label flex items-center gap-0.5">
                <IndianRupee className="h-3 w-3" />
                Est. Total (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                className="field-input"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Suggested Vendor</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g., Robu.in / Local Fastener Dealer"
                value={suggestedVendor}
                onChange={(e) => setSuggestedVendor(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Product Link / URL (Optional)
              </label>
              <input
                type="url"
                className="field-input text-xs"
                placeholder="https://..."
                value={supplierUrl}
                onChange={(e) => setSupplierUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Notes & Justification</label>
            <textarea
              rows={2}
              className="field-input resize-none"
              placeholder="e.g., Required for final steering knuckle assembly before test day"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? "Adding..." : "Add to Procurement List"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
