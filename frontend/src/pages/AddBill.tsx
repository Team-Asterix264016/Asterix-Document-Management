import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as billsApi from "../api/bills";
import { listSubsystems } from "../api/subsystems";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../components/ui/Toast";
import { apiErrorMessage } from "../api/client";
import { Spinner } from "../components/ui/Spinner";
import { formatINR } from "../utils/format";
import type { Bill, BillItem } from "../types";
import { AlertTriangle, FileText, Sparkles, UploadCloud, Plus, Trash2, ExternalLink } from "lucide-react";

const PROCESSING_MESSAGES = ["Reading bill…", "Extracting information…", "Identifying subsystem…", "Checking for duplicates…"];

type Step = "upload" | "processing" | "review";

interface FormState {
  vendor: string;
  invoiceNumber: string;
  billDate: string;
  description: string;
  subtotal: string;
  tax: string;
  discount: string;
  additionalCharges: string;
  totalAmount: string;
  items: BillItem[];
  subsystemId: string;
  newSubsystemName: string;
  usingNewSubsystem: boolean;
}

function toDateInputValue(val: string | null | undefined): string {
  if (!val) return "";
  if (typeof val === "string") {
    const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(val);
    if (isoMatch) return isoMatch[1];
    const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(val.trim());
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, "0");
      const month = ddmmyyyy[2].padStart(2, "0");
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {
    // ignore
  }
  return "";
}

function billToForm(bill: Bill, availableSubsystems?: Array<{ _id: string; name: string }> | null): FormState {
  const items: BillItem[] =
    bill.items && bill.items.length > 0
      ? bill.items.map((it) => ({
        name: it.name ?? "",
        description: it.description ?? "",
        quantity: it.quantity ?? 1,
        unitPrice: it.unitPrice ?? 0,
        tax: it.tax ?? 0,
        total: it.total ?? 0,
      }))
      : [{ name: "", description: "", quantity: 1, unitPrice: 0, tax: 0, total: 0 }];

  let subsystemId = typeof bill.subsystem === "object" && bill.subsystem ? bill.subsystem._id : (bill.subsystem as string) || "";
  let usingNewSubsystem = false;
  let newSubsystemName = "";

  const suggested = bill.aiExtraction?.suggestedSubsystem;
  const suggestedNew = bill.aiExtraction?.suggestedNewSubsystem;

  if (!subsystemId && suggested && availableSubsystems && availableSubsystems.length > 0) {
    const match = availableSubsystems.find(
      (s) => s.name.trim().toLowerCase() === suggested.trim().toLowerCase()
    );
    if (match) {
      subsystemId = match._id;
    }
  }

  if (!subsystemId && suggestedNew) {
    const match = availableSubsystems?.find(
      (s) => s.name.trim().toLowerCase() === suggestedNew.trim().toLowerCase()
    );
    if (match) {
      subsystemId = match._id;
    } else {
      usingNewSubsystem = true;
      newSubsystemName = suggestedNew;
    }
  }

  return {
    vendor: bill.vendor ?? "",
    invoiceNumber: bill.invoiceNumber ?? "",
    billDate: toDateInputValue(bill.billDate),
    description: bill.description ?? "",
    subtotal: bill.subtotal?.toString() ?? (bill.totalAmount != null ? bill.totalAmount.toString() : ""),
    tax: bill.tax?.toString() ?? "0",
    discount: bill.discount?.toString() ?? "0",
    additionalCharges: bill.additionalCharges?.toString() ?? "0",
    totalAmount: bill.totalAmount?.toString() ?? "",
    items,
    subsystemId,
    newSubsystemName,
    usingNewSubsystem,
  };
}

export function AddBill() {
  const navigate = useNavigate();
  const toast = useToast();
  const subsystems = useAsync(() => listSubsystems(), []);

  const [step, setStep] = useState<Step>("upload");
  const [bill, setBill] = useState<Bill | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [messageIdx, setMessageIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (step !== "processing") return;
    const interval = window.setInterval(() => setMessageIdx((i) => (i + 1) % PROCESSING_MESSAGES.length), 1600);
    return () => window.clearInterval(interval);
  }, [step]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, []);

  // Auto-select AI suggested subsystem if available and not yet set
  useEffect(() => {
    if (!form || !bill?.aiExtraction || !subsystems.data || subsystems.data.length === 0) return;
    if (form.subsystemId || form.usingNewSubsystem) return;

    const suggested = bill.aiExtraction.suggestedSubsystem;
    const suggestedNew = bill.aiExtraction.suggestedNewSubsystem;

    if (suggested) {
      const match = subsystems.data.find(
        (s) => s.name.trim().toLowerCase() === suggested.trim().toLowerCase()
      );
      if (match) {
        setForm((prev) => (prev ? { ...prev, subsystemId: match._id } : prev));
        return;
      }
    }

    if (suggestedNew) {
      const match = subsystems.data.find(
        (s) => s.name.trim().toLowerCase() === suggestedNew.trim().toLowerCase()
      );
      if (match) {
        setForm((prev) => (prev ? { ...prev, subsystemId: match._id } : prev));
      } else {
        setForm((prev) =>
          prev ? { ...prev, usingNewSubsystem: true, newSubsystemName: suggestedNew } : prev
        );
      }
    }
  }, [bill?.aiExtraction, subsystems.data, form?.subsystemId, form?.usingNewSubsystem]);

  async function pollBill(billId: string, attempt = 0) {
    try {
      const updated = await billsApi.getBill(billId);
      if (updated.status === "PROCESSING" && attempt < 20) {
        pollRef.current = window.setTimeout(() => pollBill(billId, attempt + 1), 1500);
        return;
      }
      setBill(updated);
      setForm(billToForm(updated, subsystems.data));
      setStep("review");
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
      setStep("upload");
    }
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const draft = await billsApi.createDraftBill();
      const uploaded = await billsApi.uploadAttachments(draft._id, Array.from(files));
      setBill(uploaded);
      setStep("processing");
      pollBill(uploaded._id);
    } catch (err) {
      toast.push(apiErrorMessage(err, "We couldn't upload this bill. Please try again."), "error");
    } finally {
      setBusy(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateItem<K extends keyof BillItem>(index: number, key: K, value: BillItem[K] | null) {
    setForm((prev) => {
      if (!prev) return prev;
      const newItems = [...prev.items];
      const current = { ...newItems[index], [key]: value };
      if (key === "quantity" || key === "unitPrice") {
        const q = key === "quantity" ? Number(value) : Number(current.quantity ?? 1);
        const p = key === "unitPrice" ? Number(value) : Number(current.unitPrice ?? 0);
        if (!isNaN(q) && !isNaN(p)) {
          current.total = Math.round(q * p * 100) / 100;
        }
      }
      newItems[index] = current;
      return { ...prev, items: newItems };
    });
  }

  function addItem() {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: [
          ...prev.items,
          { name: "", description: "", quantity: 1, unitPrice: 0, tax: 0, total: 0 },
        ],
      };
    });
  }

  function removeItem(index: number) {
    setForm((prev) => {
      if (!prev) return prev;
      if (prev.items.length <= 1) {
        toast.push("At least one item is required.", "error");
        return prev;
      }
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  }

  async function handleSubmit() {
    if (!bill || !form) return;

    if (!form.vendor.trim()) {
      toast.push("Vendor is required.", "error");
      return;
    }

    if (!form.invoiceNumber.trim()) {
      toast.push("Invoice number is required.", "error");
      return;
    }

    if (!form.billDate.trim()) {
      toast.push("Bill date is required.", "error");
      return;
    }

    if (!form.totalAmount.trim()) {
      toast.push("Total amount is required.", "error");
      return;
    }
    const totalAmount = Number(form.totalAmount);
    if (Number.isNaN(totalAmount) || totalAmount < 0) {
      toast.push("Please enter a valid total amount.", "error");
      return;
    }

    if (!form.description.trim()) {
      toast.push("Description is required.", "error");
      return;
    }

    if (form.items.length === 0) {
      toast.push("At least one item is required.", "error");
      return;
    }

    for (let i = 0; i < form.items.length; i++) {
      const it = form.items[i];
      if (!it.name || !it.name.trim()) {
        toast.push(`Item #${i + 1}: Name is required.`, "error");
        return;
      }
      if (it.quantity == null || Number.isNaN(Number(it.quantity)) || Number(it.quantity) <= 0) {
        toast.push(`Item #${i + 1}: Quantity must be greater than 0.`, "error");
        return;
      }
      if (it.unitPrice == null || Number.isNaN(Number(it.unitPrice)) || Number(it.unitPrice) < 0) {
        toast.push(`Item #${i + 1}: Unit price must be 0 or greater.`, "error");
        return;
      }
      if (it.total == null || Number.isNaN(Number(it.total)) || Number(it.total) < 0) {
        toast.push(`Item #${i + 1}: Total must be 0 or greater.`, "error");
        return;
      }
    }

    if (!form.subtotal.trim()) {
      toast.push("Subtotal is required.", "error");
      return;
    }
    const subtotal = Number(form.subtotal);
    if (Number.isNaN(subtotal) || subtotal < 0) {
      toast.push("Subtotal must be a valid number.", "error");
      return;
    }

    if (!form.tax.trim()) {
      toast.push("Tax is required (enter 0 if no tax).", "error");
      return;
    }
    const tax = Number(form.tax);
    if (Number.isNaN(tax) || tax < 0) {
      toast.push("Tax must be a valid number.", "error");
      return;
    }

    if (!form.discount.trim()) {
      toast.push("Discount is required (enter 0 if no discount).", "error");
      return;
    }
    const discount = Number(form.discount);
    if (Number.isNaN(discount) || discount < 0) {
      toast.push("Discount must be a valid number.", "error");
      return;
    }

    if (!form.subsystemId && !(form.usingNewSubsystem && form.newSubsystemName.trim())) {
      toast.push("Please select or enter a subsystem.", "error");
      return;
    }

    setBusy(true);
    try {
      await billsApi.updateBill(bill._id, {
        vendor: form.vendor.trim(),
        invoiceNumber: form.invoiceNumber.trim(),
        billDate: form.billDate.trim(),
        description: form.description.trim(),
        subtotal,
        tax,
        discount,
        additionalCharges: form.additionalCharges ? Number(form.additionalCharges) : 0,
        totalAmount,
        items: form.items.map((it) => ({
          name: it.name.trim(),
          description: it.description?.trim() || "",
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          tax: Number(it.tax) || 0,
          total: Number(it.total) || 0,
        })),
        subsystemId: form.usingNewSubsystem ? null : form.subsystemId || null,
        newSubsystemName: form.usingNewSubsystem ? form.newSubsystemName.trim() || null : null,
      });

      const refreshed = await billsApi.getBill(bill._id);
      const finalSubsystemId =
        typeof refreshed.subsystem === "object" && refreshed.subsystem ? refreshed.subsystem._id : form.subsystemId;

      const submitted = await billsApi.submitBill(bill._id, finalSubsystemId);
      toast.push("Bill submitted for approval.", "success");
      navigate(`/bills/${submitted._id}`);
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  if (step === "upload") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <h1 className="text-xl font-semibold text-ink-900">Add Bill</h1>

        <label className="card flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed px-6 py-14 text-center transition-colors hover:border-accent hover:bg-accent-soft/40 active:scale-[0.995]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <UploadCloud className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <span className="text-sm font-medium text-ink-900">Upload evidence</span>
          <span className="max-w-xs text-sm text-ink-500">PDF, JPG, or PNG — tap to use your camera or choose a file</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
            disabled={busy}
          />
          <span className="btn-primary mt-2">{busy ? "Uploading…" : "Choose files"}</span>
        </label>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-20 text-center">
        <Spinner className="h-8 w-8" />
        <p key={messageIdx} className="animate-fade-up text-sm font-medium text-ink-900">
          {PROCESSING_MESSAGES[messageIdx]}
        </p>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
        </div>
        <p className="text-sm text-ink-500">This usually takes a few seconds.</p>
      </div>
    );
  }

  if (!bill || !form) return null;

  const warnings = bill.aiExtraction?.warnings ?? [];
  const aiFailed = bill.aiExtraction && !bill.aiExtraction.processed && bill.aiExtraction.error;
  const suggested = bill.aiExtraction?.suggestedSubsystem;
  const suggestedNew = bill.aiExtraction?.suggestedNewSubsystem;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Review Bill</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <p className="field-label">Bill Evidence</p>
          {bill.attachments.length === 0 ? (
            <p className="text-sm text-ink-500">No file uploaded — manual entry.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {bill.attachments.map((a, i) => {
                const targetUrl = a.driveUrl || billsApi.getAttachmentUrl(bill._id, i);
                return (
                  <a
                    key={i}
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center justify-between gap-2 rounded-sm border border-line px-3 py-2.5 text-sm text-ink-700 transition-colors hover:border-accent hover:bg-accent-soft/40"
                    title={`Click to view ${a.originalName}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                      <span className="min-w-0 truncate font-medium text-ink-900">{a.originalName}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-xs text-accent">View</span>
                      <ExternalLink className="h-3.5 w-3.5 text-ink-400" strokeWidth={2} />
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-4 p-4">
          {aiFailed && (
            <div className="flex items-start gap-2.5 rounded-sm border border-status-pending/30 bg-status-pendingSoft px-3 py-2.5 text-sm text-status-pending">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>We couldn't process this bill automatically. You can still enter the details manually.</span>
            </div>
          )}

          {bill.duplicateCheck?.possibleDuplicate && (
            <div className="flex items-start gap-2.5 rounded-sm border border-status-pending/30 bg-status-pendingSoft px-3 py-2.5 text-sm text-status-pending">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>Possible duplicate detected. This bill will still be submitted — the treasurer makes the final call.</span>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-sm border border-status-pending/30 bg-status-pendingSoft px-3 py-2.5 text-sm text-status-pending">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <div>
                <p className="font-medium">Please double-check:</p>
                <ul className="ml-4 list-disc">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Vendor <span className="text-status-rejected">*</span></label>
              <input className="field-input" required value={form.vendor} onChange={(e) => updateField("vendor", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Invoice Number <span className="text-status-rejected">*</span></label>
              <input className="field-input" required value={form.invoiceNumber} onChange={(e) => updateField("invoiceNumber", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Bill Date <span className="text-status-rejected">*</span></label>
              <input type="date" className="field-input" required value={form.billDate} onChange={(e) => updateField("billDate", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Total Amount (₹) <span className="text-status-rejected">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="field-input"
                required
                value={form.totalAmount}
                onChange={(e) => updateField("totalAmount", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Description <span className="text-status-rejected">*</span></label>
            <textarea className="field-input" rows={2} required value={form.description} onChange={(e) => updateField("description", e.target.value)} />
          </div>

          <div className="border-t border-line pt-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="field-label mb-0">Items <span className="text-status-rejected">*</span></label>
              <button onClick={addItem} type="button" className="flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover">
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>

            {form.items.length === 0 ? (
              <p className="text-sm text-ink-500 italic">No items added. Click "Add Item" above to add an item.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-2 rounded-sm border border-line bg-ink-50/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <input
                        className="field-input text-sm font-medium"
                        placeholder="Item name *"
                        required
                        value={item.name}
                        onChange={(e) => updateItem(idx, "name", e.target.value)}
                      />
                      {form.items.length > 1 && (
                        <button
                          onClick={() => removeItem(idx)}
                          type="button"
                          className="p-1 text-ink-400 transition-colors hover:text-status-rejected"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="mb-1 block text-xs text-ink-500">Qty <span className="text-status-rejected">*</span></span>
                        <input
                          type="number"
                          min="1"
                          required
                          className="field-input px-2 py-1 text-sm"
                          value={item.quantity ?? ""}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>
                      <div>
                        <span className="mb-1 block text-xs text-ink-500">Price (₹) <span className="text-status-rejected">*</span></span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="field-input px-2 py-1 text-sm"
                          value={item.unitPrice ?? ""}
                          onChange={(e) => updateItem(idx, "unitPrice", e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>
                      <div>
                        <span className="mb-1 block text-xs text-ink-500">Total (₹) <span className="text-status-rejected">*</span></span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="field-input px-2 py-1 text-sm"
                          value={item.total ?? ""}
                          onChange={(e) => updateItem(idx, "total", e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="field-label">Subtotal <span className="text-status-rejected">*</span></label>
              <input type="number" min="0" step="0.01" required className="field-input" value={form.subtotal} onChange={(e) => updateField("subtotal", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Tax <span className="text-status-rejected">*</span></label>
              <input type="number" min="0" step="0.01" required className="field-input" value={form.tax} onChange={(e) => updateField("tax", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Discount <span className="text-status-rejected">*</span></label>
              <input type="number" min="0" step="0.01" required className="field-input" value={form.discount} onChange={(e) => updateField("discount", e.target.value)} />
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <label className="field-label flex flex-wrap items-center gap-1">
              Subsystem <span className="text-status-rejected">*</span>
              {suggested && (
                <span className="inline-flex items-center gap-1 normal-case text-accent font-medium">
                  <Sparkles className="h-3 w-3" strokeWidth={2} /> AI suggested {suggested}
                  {form.subsystemId && subsystems.data?.find((s) => s._id === form.subsystemId)?.name.toLowerCase() === suggested.toLowerCase() && (
                    <span className="rounded bg-accent/10 px-1 py-0.2 text-[10px] font-bold text-accent">Auto-selected</span>
                  )}
                </span>
              )}
            </label>
            <select
              className="field-input"
              required
              value={form.usingNewSubsystem ? "__new__" : form.subsystemId}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setForm((prev) => (prev ? { ...prev, usingNewSubsystem: true, newSubsystemName: suggestedNew ?? "" } : prev));
                } else {
                  setForm((prev) => (prev ? { ...prev, usingNewSubsystem: false, subsystemId: e.target.value, newSubsystemName: "" } : prev));
                }
              }}
            >
              <option value="">Select a subsystem</option>
              {subsystems.data?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
              <option value="__new__">+ New subsystem…</option>
            </select>
            {form.usingNewSubsystem && (
              <input
                className="field-input mt-2"
                required
                placeholder="New subsystem name *"
                value={form.newSubsystemName}
                onChange={(e) => updateField("newSubsystemName", e.target.value)}
              />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm text-ink-500">Total</span>
            <span className="text-lg font-semibold text-ink-900">{formatINR(form.totalAmount ? Number(form.totalAmount) : null)}</span>
          </div>

          <button className="btn-primary w-full" onClick={handleSubmit} disabled={busy}>
            {busy ? "Submitting…" : "Submit for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
