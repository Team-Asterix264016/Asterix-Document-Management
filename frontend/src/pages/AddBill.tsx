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
import { AlertTriangle, FileText, PenLine, Sparkles, UploadCloud } from "lucide-react";

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

function billToForm(bill: Bill): FormState {
  return {
    vendor: bill.vendor ?? "",
    invoiceNumber: bill.invoiceNumber ?? "",
    billDate: bill.billDate ? bill.billDate.slice(0, 10) : "",
    description: bill.description ?? "",
    subtotal: bill.subtotal?.toString() ?? "",
    tax: bill.tax?.toString() ?? "",
    discount: bill.discount?.toString() ?? "",
    additionalCharges: bill.additionalCharges?.toString() ?? "",
    totalAmount: bill.totalAmount?.toString() ?? "",
    items: bill.items ?? [],
    subsystemId: typeof bill.subsystem === "object" && bill.subsystem ? bill.subsystem._id : "",
    newSubsystemName: "",
    usingNewSubsystem: false,
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

  async function pollBill(billId: string, attempt = 0) {
    try {
      const updated = await billsApi.getBill(billId);
      if (updated.status === "PROCESSING" && attempt < 20) {
        pollRef.current = window.setTimeout(() => pollBill(billId, attempt + 1), 1500);
        return;
      }
      setBill(updated);
      setForm(billToForm(updated));
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

  async function handleManualEntry() {
    setBusy(true);
    try {
      const draft = await billsApi.createDraftBill();
      setBill(draft);
      setForm(billToForm(draft));
      setStep("review");
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit() {
    if (!bill || !form) return;
    if (!form.subsystemId && !(form.usingNewSubsystem && form.newSubsystemName.trim())) {
      toast.push("Please select or suggest a subsystem before submitting.", "error");
      return;
    }
    const totalAmount = form.totalAmount ? Number(form.totalAmount) : null;
    if (totalAmount == null || Number.isNaN(totalAmount)) {
      toast.push("Total amount is required before submission.", "error");
      return;
    }

    setBusy(true);
    try {
      await billsApi.updateBill(bill._id, {
        vendor: form.vendor || null,
        invoiceNumber: form.invoiceNumber || null,
        billDate: form.billDate || null,
        description: form.description,
        subtotal: form.subtotal ? Number(form.subtotal) : null,
        tax: form.tax ? Number(form.tax) : null,
        discount: form.discount ? Number(form.discount) : null,
        additionalCharges: form.additionalCharges ? Number(form.additionalCharges) : null,
        totalAmount,
        items: form.items,
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

        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink-300">
          <div className="h-px flex-1 bg-line" />
          or
          <div className="h-px flex-1 bg-line" />
        </div>

        <button className="btn-secondary" onClick={handleManualEntry} disabled={busy}>
          <PenLine className="h-4 w-4" strokeWidth={2} />
          Enter bill manually
        </button>
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
              {bill.attachments.map((a, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2 rounded-sm border border-line px-3 py-2.5 text-sm text-ink-700">
                  <FileText className="h-4 w-4 shrink-0 text-ink-300" strokeWidth={2} />
                  <span className="min-w-0 flex-1 truncate">{a.originalName}</span>
                </div>
              ))}
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
              <label className="field-label">Vendor</label>
              <input className="field-input" value={form.vendor} onChange={(e) => updateField("vendor", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Invoice Number</label>
              <input className="field-input" value={form.invoiceNumber} onChange={(e) => updateField("invoiceNumber", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Bill Date</label>
              <input type="date" className="field-input" value={form.billDate} onChange={(e) => updateField("billDate", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Total Amount (₹)</label>
              <input
                type="number"
                className="field-input"
                value={form.totalAmount}
                onChange={(e) => updateField("totalAmount", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Description</label>
            <textarea className="field-input" rows={2} value={form.description} onChange={(e) => updateField("description", e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="field-label">Subtotal</label>
              <input type="number" className="field-input" value={form.subtotal} onChange={(e) => updateField("subtotal", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Tax</label>
              <input type="number" className="field-input" value={form.tax} onChange={(e) => updateField("tax", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Discount</label>
              <input type="number" className="field-input" value={form.discount} onChange={(e) => updateField("discount", e.target.value)} />
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <label className="field-label flex flex-wrap items-center gap-1">
              Subsystem
              {suggested && (
                <span className="inline-flex items-center gap-1 normal-case text-accent">
                  <Sparkles className="h-3 w-3" strokeWidth={2} /> AI suggested {suggested}
                </span>
              )}
            </label>
            <select
              className="field-input"
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
                placeholder="New subsystem name"
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
