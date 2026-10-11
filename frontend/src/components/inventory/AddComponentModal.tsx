import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  createInventoryItem,
  updateInventoryItem,
  getTeamMembers,
  type TeamMember,
} from "../../api/inventory";
import type { InventoryItem } from "../../types";
import { useToast } from "../ui/Toast";
import { X, Plus, Save, Package, Layers, Hash, MapPin, AlignLeft, Users, User } from "lucide-react";

interface Props {
  isOpen: boolean;
  initialItem?: InventoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

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

const UNIT_PRESETS = ["pcs", "sets", "meters", "kg", "liters", "boxes"];

export function AddComponentModal({ isOpen, initialItem, onClose, onSuccess }: Props) {
  const { push } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [category, setCategory] = useState("Fasteners & Hardware");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [location, setLocation] = useState("Main Workshop");
  const [assignedTo, setAssignedTo] = useState("ALL");
  const [description, setDescription] = useState("");
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
      getTeamMembers()
        .then((mems) => {
          setMembers(mems);
        })
        .catch(() => push("Failed to load team members", "error"));
    }
  }, [isOpen, push]);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || "");
      setPartNumber(initialItem.partNumber || "");
      setCategory(initialItem.category || "Fasteners & Hardware");
      setQuantity(String(initialItem.quantity || 1));
      setUnit(initialItem.unit || "pcs");
      setLocation(initialItem.location || "Main Workshop");
      setAssignedTo(
        initialItem.assignedToAll
          ? "ALL"
          : (initialItem.assignedTo as any)?._id || "ALL"
      );
      setDescription(initialItem.description || "");
    } else {
      setName("");
      setPartNumber("");
      setCategory("Fasteners & Hardware");
      setQuantity("1");
      setUnit("pcs");
      setLocation("Main Workshop");
      setAssignedTo("ALL");
      setDescription("");
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      push("Component name is required", "error");
      return;
    }

    setIsSubmitting(true);
    const isAll = assignedTo === "ALL";

    try {
      if (initialItem) {
        await updateInventoryItem(initialItem._id, {
          name: name.trim(),
          partNumber: partNumber.trim(),
          category: category.trim(),
          quantity: Math.max(0, parseInt(quantity, 10) || 1),
          unit: unit.trim(),
          location: location.trim() || "Main Workshop",
          assignedToAll: isAll,
          assignedTo: isAll ? undefined : (assignedTo as any),
          description: description.trim(),
        });
        push(`"${name}" updated successfully!`, "success");
      } else {
        await createInventoryItem({
          name: name.trim(),
          partNumber: partNumber.trim(),
          category: category.trim(),
          quantity: Math.max(0, parseInt(quantity, 10) || 1),
          unit: unit.trim(),
          location: location.trim() || "Main Workshop",
          assignedToAll: isAll,
          assignedTo: isAll ? undefined : (assignedTo as any),
          description: description.trim(),
        });
        push(`"${name}" registered in inventory successfully!`, "success");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Failed to save component";
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">
                {initialItem ? "Edit Component" : "Add New Component"}
              </h2>
              <p className="text-xs text-ink-500">
                {initialItem
                  ? "Update component details and custody assignment"
                  : "Register workshop hardware into the tracking system"}
              </p>
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
          {/* Component Name */}
          <div>
            <label className="field-label flex items-center gap-1">
              <Package className="h-3 w-3" />
              Component Name *
            </label>
            <input
              type="text"
              required
              className="field-input"
              placeholder="e.g., Wilwood 2-Piston Brake Caliper"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Assigned To (Particular Person or All) */}
          <div>
            <label className="field-label flex items-center gap-1">
              {assignedTo === "ALL" ? (
                <Users className="h-3.5 w-3.5 text-accent" />
              ) : (
                <User className="h-3.5 w-3.5 text-indigo-600" />
              )}
              Assign Custody / Possession
            </label>
            <select
              className="field-input font-medium"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="ALL">👥 All Team Members (Shared / Workshop)</option>
              <optgroup label="Assign to Individual Member">
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    👤 {m.displayName} ({m.username})
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="mt-1 text-[11px] text-ink-400">
              {assignedTo === "ALL"
                ? "This component is shared and accessible by all team members in the workshop."
                : "Assigned directly to this member for custody and tracking."}
            </p>
          </div>

          {/* Part Number & Category */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Part # / SKU (Optional)
              </label>
              <input
                type="text"
                className="field-input font-mono text-xs"
                placeholder="e.g., 120-6806 / SEN-049"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Category *
              </label>
              <select
                className="field-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORY_PRESETS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="field-label flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Where It Is (Location) *
            </label>
            <input
              type="text"
              required
              className="field-input"
              placeholder="e.g., Bay 2 - Shelf 3, Bin C"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Quantity</label>
              <input
                type="number"
                min="0"
                className="field-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Unit of Measure</label>
              <select
                className="field-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {UNIT_PRESETS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="field-label flex items-center gap-1">
              <AlignLeft className="h-3 w-3" />
              Description & Specifications
            </label>
            <textarea
              rows={2}
              className="field-input resize-none"
              placeholder="e.g., 3/8-24 inlet port, for front right brake assembly"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
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
              {initialItem ? (
                <>
                  <Save className="h-4 w-4" />
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {isSubmitting ? "Adding..." : "Add Component"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
