import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAsync } from "../hooks/useAsync";
import * as billsApi from "../api/bills";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ui/Toast";
import { apiErrorMessage } from "../api/client";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Spinner } from "../components/ui/Spinner";
import { formatDate, formatDateTime, formatINR, nameOf, subsystemName } from "../utils/format";
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, XCircle } from "lucide-react";

export function BillDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: bill, loading, error, reload } = useAsync(() => billsApi.getBill(id!), [id]);

  async function handleApprove() {
    if (!id) return;
    setBusy(true);
    try {
      await billsApi.approveBill(id);
      toast.push("Bill approved.", "success");
      reload();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!id) return;
    setBusy(true);
    try {
      await billsApi.rejectBill(id, rejectReason || undefined);
      toast.push("Bill rejected.", "success");
      setShowRejectForm(false);
      reload();
    } catch (err) {
      toast.push(apiErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error || !bill) {
    return <p className="text-sm text-status-rejected">Bill not found.</p>;
  }

  const canDecide = user?.role === "TREASURER" && bill.status === "PENDING_APPROVAL";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="mb-2 flex items-center gap-1 text-sm text-ink-500 transition-colors hover:text-ink-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Back
          </button>
          <h1 className="truncate text-xl font-semibold text-ink-900">{bill.vendor ?? "Untitled bill"}</h1>
          <p className="text-sm text-ink-500">{subsystemName(bill.subsystem)}</p>
        </div>
        <StatusBadge status={bill.status} />
      </div>

      {bill.duplicateCheck?.possibleDuplicate && (
        <div className="rounded-sm border border-status-pending/30 bg-status-pendingSoft px-4 py-3 text-sm text-status-pending">
          Possible duplicate detected — please compare against the matching bill before deciding.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <p className="field-label">Bill Evidence</p>
          {bill.attachments.length === 0 ? (
            <p className="text-sm text-ink-500">No file attached (manual entry).</p>
          ) : (
            <div className="flex flex-col gap-2">
              {bill.attachments.map((a, i) =>
                a.driveUrl ? (
                  <a
                    key={i}
                    href={a.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-2 rounded-sm border border-line px-3 py-2.5 text-sm text-accent transition-colors hover:border-accent/40 hover:bg-accent-soft"
                  >
                    <FileText className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="min-w-0 flex-1 truncate">{a.originalName}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  </a>
                ) : (
                  <div key={i} className="flex min-w-0 items-center gap-2 rounded-sm border border-line px-3 py-2.5 text-sm text-ink-500">
                    <FileText className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="min-w-0 flex-1 truncate">{a.originalName}</span>
                    <span className="shrink-0 text-xs">syncing…</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-4 p-4">
          <p className="field-label">Bill Information</p>

          <dl className="flex flex-col divide-y divide-line text-sm">
            {[
              ["Vendor", bill.vendor ?? "—"],
              ["Invoice Number", bill.invoiceNumber ?? "—"],
              ["Bill Date", formatDate(bill.billDate)],
              ["Submitted By", nameOf(bill.uploadedBy)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2 first:pt-0">
                <dt className="shrink-0 text-ink-500">{label}</dt>
                <dd className="min-w-0 truncate text-right font-medium text-ink-900">{value}</dd>
              </div>
            ))}
            {bill.description && (
              <div className="py-2">
                <dt className="mb-1 text-ink-500">Description</dt>
                <dd className="font-medium leading-relaxed text-ink-900">{bill.description}</dd>
              </div>
            )}
          </dl>

          <div className="border-t border-line pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Subtotal</span>
              <span className="tabular-nums text-ink-900">{formatINR(bill.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Tax</span>
              <span className="tabular-nums text-ink-900">{formatINR(bill.tax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Discount</span>
              <span className="tabular-nums text-ink-900">{formatINR(bill.discount ? -bill.discount : bill.discount)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-semibold">
              <span className="text-ink-900">Total</span>
              <span className="tabular-nums text-ink-900">{formatINR(bill.totalAmount)}</span>
            </div>
          </div>

          {bill.items.length > 0 && (
            <div className="border-t border-line pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Items</p>
              <div className="flex flex-col gap-1.5">
                {bill.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-ink-700">
                      {item.name} {item.quantity ? `× ${item.quantity}` : ""}
                    </span>
                    <span className="tabular-nums text-ink-900">{formatINR(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bill.status === "REJECTED" && bill.rejectionReason && (
            <div className="rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-sm text-status-rejected">
              Rejected: {bill.rejectionReason}
            </div>
          )}

          {bill.approvedAt && <p className="text-xs text-ink-500">Approved {formatDateTime(bill.approvedAt)}</p>}
          {bill.rejectedAt && <p className="text-xs text-ink-500">Rejected {formatDateTime(bill.rejectedAt)}</p>}

          {canDecide && (
            <div className="border-t border-line pt-4">
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <button className="btn-primary flex-1" onClick={handleApprove} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                    Accept
                  </button>
                  <button className="btn-danger flex-1" onClick={() => setShowRejectForm(true)} disabled={busy}>
                    <XCircle className="h-4 w-4" strokeWidth={2} />
                    Reject
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="field-label">Rejection reason (optional)</label>
                  <textarea className="field-input" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button className="btn-danger flex-1" onClick={handleReject} disabled={busy}>
                      Confirm Reject
                    </button>
                    <button className="btn-ghost" onClick={() => setShowRejectForm(false)} disabled={busy}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
