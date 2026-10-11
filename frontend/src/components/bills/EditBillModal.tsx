import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileEdit, Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import * as billsApi from "../../api/bills";
import { listSubsystems } from "../../api/subsystems";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";
import { apiErrorMessage } from "../../api/client";
import type { Bill, BillItem, BillStatus, Subsystem } from "../../types";

interface EditBillModalProps {
  isOpen: boolean;
  bill: Bill;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditBillModal({ isOpen, bill, onClose, onSuccess }: EditBillModalProps) {
  const { user } = useAuth();
  const toast = useToast();

  const isPrivileged = user?.role === "ADMIN" || user?.role === "TREASURER";

  const [vendor, setVendor] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [subsystemId, setSubsystemId] = useState("");
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [description, setDescription] = useState("");
  const [subtotal, setSubtotal] = useState<string>("");
  const [tax, setTax] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [status, setStatus] = useState<BillStatus>("DRAFT");
  const [items, setItems] = useState<BillItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSubsystems()
      .then((data) => setSubsystems(data))
      .catch((err) => console.error("Failed to load subsystems:", err));
  }, []);

  useEffect(() => {
    if (isOpen && bill) {
      setVendor(bill.vendor || "");
      setInvoiceNumber(bill.invoiceNumber || "");
      setBillDate(bill.billDate ? bill.billDate.split("T")[0] : "");

      const currentSubsystemId =
        typeof bill.subsystem === "object" && bill.subsystem ? bill.subsystem._id : (bill.subsystem as string) || "";
      setSubsystemId(currentSubsystemId);

      setDescription(bill.description || "");
      setSubtotal(bill.subtotal !== null && bill.subtotal !== undefined ? String(bill.subtotal) : "");
      setTax(bill.tax !== null && bill.tax !== undefined ? String(bill.tax) : "");
      setDiscount(bill.discount !== null && bill.discount !== undefined ? String(bill.discount) : "");
      setTotalAmount(bill.totalAmount !== null && bill.totalAmount !== undefined ? String(bill.totalAmount) : "");
      setStatus(bill.status);
      setItems(
        bill.items?.map((item) => ({
          name: item.name || "",
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
          tax: item.tax ?? 0,
          total: item.total ?? 0,
        })) || []
      );
      setError(null);
    }
  }, [isOpen, bill]);

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

  function handleAddItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1, unitPrice: 0, total: 0 }]);
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleItemChange(index: number, field: keyof BillItem, val: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };
      if (field === "quantity" || field === "unitPrice") {
        const q = field === "quantity" ? Number(val) : Number(item.quantity ?? 1);
        const p = field === "unitPrice" ? Number(val) : Number(item.unitPrice ?? 0);
        item.total = Math.round(q * p * 100) / 100;
      }
      updated[index] = item;
      return updated;
    });
  }

  function handleRecalculateFromItems() {
    const sum = items.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    setSubtotal(String(sum));
    const taxNum = Number(tax) || 0;
    const discNum = Number(discount) || 0;
    setTotalAmount(String(Math.max(0, sum + taxNum - discNum)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      const parsedSubtotal = subtotal === "" ? null : Number(subtotal);
      const parsedTax = tax === "" ? null : Number(tax);
      const parsedDiscount = discount === "" ? null : Number(discount);
      const parsedTotal = totalAmount === "" ? null : Number(totalAmount);

      if (parsedTotal !== null && (isNaN(parsedTotal) || parsedTotal < 0)) {
        setError("Total amount must be a positive number");
        setIsSubmitting(false);
        return;
      }

      const payload: Record<string, unknown> = {
        vendor: vendor.trim() || null,
        invoiceNumber: invoiceNumber.trim() || null,
        billDate: billDate || null,
        description: description.trim(),
        subsystemId: subsystemId || null,
        subtotal: parsedSubtotal,
        tax: parsedTax,
        discount: parsedDiscount,
        totalAmount: parsedTotal,
        items: items
          .filter((it) => it.name.trim().length > 0)
          .map((it) => ({
            name: it.name.trim(),
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            tax: Number(it.tax) || 0,
            total: Number(it.total) || 0,
          })),
      };

      if (isPrivileged) {
        payload.status = status;
      }

      await billsApi.updateBill(bill._id, payload);
      toast.push("Bill updated successfully", "success");
      onSuccess();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
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
        aria-labelledby="edit-bill-title"
        className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto animate-scale-up p-6 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <h2 id="edit-bill-title" className="text-base font-bold text-ink-900">
                Edit Bill
              </h2>
              <p className="text-xs text-ink-500">Update vendor, amounts, items, or status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-400 hover:bg-surface hover:text-ink-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-status-rejected/30 bg-status-rejectedSoft p-3 text-sm text-status-rejected">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bill-vendor" className="field-label">
                Vendor Name
              </label>
              <input
                id="bill-vendor"
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g., McMaster-Carr, Local Hardware"
                className="field-input mt-1"
              />
            </div>

            <div>
              <label htmlFor="bill-invoice" className="field-label">
                Invoice Number
              </label>
              <input
                id="bill-invoice"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g., INV-2024-001"
                className="field-input mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bill-date" className="field-label">
                Bill Date
              </label>
              <input
                id="bill-date"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="field-input mt-1"
              />
            </div>

            <div>
              <label htmlFor="bill-subsystem" className="field-label">
                Subsystem
              </label>
              <select
                id="bill-subsystem"
                value={subsystemId}
                onChange={(e) => setSubsystemId(e.target.value)}
                className="field-input mt-1"
              >
                <option value="">Select Subsystem</option>
                {subsystems.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isPrivileged && (
            <div>
              <label htmlFor="bill-status" className="field-label">
                Bill Status
              </label>
              <select
                id="bill-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as BillStatus)}
                className="field-input mt-1"
              >
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="bill-description" className="field-label">
              Description / Notes
            </label>
            <textarea
              id="bill-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context or notes about this purchase..."
              className="field-input mt-1"
            />
          </div>

          {/* Amount fields */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="bill-subtotal" className="field-label">
                Subtotal (₹)
              </label>
              <input
                id="bill-subtotal"
                type="number"
                step="any"
                min="0"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                placeholder="0"
                className="field-input mt-1"
              />
            </div>
            <div>
              <label htmlFor="bill-tax" className="field-label">
                Tax (₹)
              </label>
              <input
                id="bill-tax"
                type="number"
                step="any"
                min="0"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="0"
                className="field-input mt-1"
              />
            </div>
            <div>
              <label htmlFor="bill-discount" className="field-label">
                Discount (₹)
              </label>
              <input
                id="bill-discount"
                type="number"
                step="any"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="field-input mt-1"
              />
            </div>
            <div>
              <label htmlFor="bill-total" className="field-label font-semibold text-accent">
                Total (₹) *
              </label>
              <input
                id="bill-total"
                type="number"
                step="any"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0"
                required
                className="field-input mt-1 font-semibold"
              />
            </div>
          </div>

          {/* Line items section */}
          <div className="rounded-md border border-line bg-canvas/50 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                Line Items ({items.length})
              </span>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRecalculateFromItems}
                    className="text-xs text-accent hover:underline"
                  >
                    Calculate Total
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 rounded bg-accent-soft px-2 py-1 text-xs font-medium text-accent hover:bg-accent/20"
                >
                  <Plus className="h-3 w-3" /> Add Item
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="py-2 text-center text-xs text-ink-400">
                No individual items listed. You can add items or simply keep the bill total.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      className="field-input flex-1 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity ?? 1}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      className="field-input w-16 text-xs text-center"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      step="any"
                      min="0"
                      value={item.unitPrice ?? 0}
                      onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                      className="field-input w-20 text-xs text-right"
                    />
                    <input
                      type="number"
                      placeholder="Total"
                      step="any"
                      min="0"
                      value={item.total ?? 0}
                      onChange={(e) => handleItemChange(idx, "total", e.target.value)}
                      className="field-input w-24 text-xs text-right font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-ink-400 hover:text-status-rejected"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
