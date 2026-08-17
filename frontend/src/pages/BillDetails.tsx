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
        <div>
          <button onClick={() => navigate(-1)} className="mb-2 text-sm text-ink-500 hover:text-ink-900">
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-ink-900">{bill.vendor ?? "Untitled bill"}</h1>
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
                  <a key={i} href={a.driveUrl} target="_blank" rel="noreferrer" className="rounded-sm border border-line px-3 py-2 text-sm text-accent hover:bg-canvas">
                    {a.originalName} ↗
                  </a>
                ) : (
                  <div key={i} className="rounded-sm border border-line px-3 py-2 text-sm text-ink-500">
                    {a.originalName} (evidence syncing)
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-4 p-4">
          <p className="field-label">Bill Information</p>

          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-ink-500">Vendor</dt>
            <dd className="text-right font-medium text-ink-900">{bill.vendor ?? "—"}</dd>
            <dt className="text-ink-500">Invoice Number</dt>
            <dd className="text-right font-medium text-ink-900">{bill.invoiceNumber ?? "—"}</dd>
            <dt className="text-ink-500">Bill Date</dt>
            <dd className="text-right font-medium text-ink-900">{formatDate(bill.billDate)}</dd>
            <dt className="text-ink-500">Submitted By</dt>
            <dd className="text-right font-medium text-ink-900">{nameOf(bill.uploadedBy)}</dd>
            <dt className="text-ink-500">Description</dt>
            <dd className="text-right font-medium text-ink-900">{bill.description || "—"}</dd>
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
                    Accept
                  </button>
                  <button className="btn-danger flex-1" onClick={() => setShowRejectForm(true)} disabled={busy}>
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
