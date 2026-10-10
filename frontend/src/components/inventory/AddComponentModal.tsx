import { useState, useEffect } from "react";
import { createInventoryItem } from "../../api/inventory";
import { listSubsystems } from "../../api/subsystems";
import type { Subsystem } from "../../types";
import { useToast } from "../ui/Toast";
import { X, Plus, Package, Layers, Hash, MapPin, AlignLeft } from "lucide-react";

interface Props {
  isOpen: boolean;
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

export function AddComponentModal({ isOpen, onClose, onSuccess }: Props) {
  const { push } = useToast();
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [subsystemId, setSubsystemId] = useState("");
  const [category, setCategory] = useState("Fasteners & Hardware");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [location, setLocation] = useState("Main Workshop");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!name.trim()) {
      push("Component name is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await createInventoryItem({
        name: name.trim(),
        partNumber: partNumber.trim(),
        subsystem: (subsystemId || undefined) as any,
        category: category.trim(),
        quantity: Math.max(0, parseInt(quantity, 10) || 1),
        unit: unit.trim(),
        location: location.trim() || "Main Workshop",
        description: description.trim(),
      });

      push(`"${name}" registered in inventory successfully!`, "success");
      onSuccess();
      onClose();
      // Reset form
      setName("");
      setPartNumber("");
      setDescription("");
      setQuantity("1");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Failed to add component";
      push(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-card animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">Add New Component</h2>
              <p className="text-xs text-ink-500">Register workshop hardware into the tracking system</p>
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

          {/* Part Number & Subsystem */}
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
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Category</label>
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

            <div>
              <label className="field-label flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Storage Location *
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
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Adding..." : "Add Component"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
