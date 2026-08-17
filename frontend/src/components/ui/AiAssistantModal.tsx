import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { queryBillsAi, type AiQueryResult } from "../../api/analytics";
import { apiErrorMessage } from "../../api/client";
import { StatusBadge } from "./StatusBadge";
import { formatINR, formatDate } from "../../utils/format";
import type { BillStatus } from "../../types";

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_PROMPTS = [
  "What is our total spend breakdown by subsystem?",
  "Show all pending bills awaiting approval",
  "Find all bills from top vendors over ₹10,000",
  "List rejected bills and reasons for rejection",
];

export function AiAssistantModal({ isOpen, onClose }: AiAssistantModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSearch(searchQuery: string) {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await queryBillsAi(searchQuery);
      setResult(res);
    } catch (err) {
      setError(apiErrorMessage(err, "AI Assistant is unavailable right now. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Bill Assistant"
        className="animate-fade-up w-full max-w-2xl overflow-hidden rounded-lg border border-line bg-surface shadow-card"
      >
        <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Sparkles className="h-4.5 w-4.5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink-900">AI Bill Assistant</h3>
              <p className="text-xs text-ink-500">Ask about bills, spend, or vendors in plain language</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-sm p-1.5 text-ink-500 transition-colors hover:bg-canvas hover:text-ink-900">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="relative"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Total spent on Powertrain this month…"
              className="field-input pr-24"
              autoFocus
            />
            <button type="submit" disabled={loading || !query.trim()} className="btn-primary absolute right-1.5 top-1.5 !px-3 !py-1.5 text-xs">
              {loading ? "Asking…" : "Ask AI"}
            </button>
          </form>

          {!result && !loading && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-500">Suggested Queries</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setQuery(prompt);
                      handleSearch(prompt);
                    }}
                    className="rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm text-ink-500">Reading through your bill records…</p>
            </div>
          )}

          {error && (
            <div className="rounded-sm border border-status-rejected/30 bg-status-rejectedSoft p-3 text-sm text-status-rejected">{error}</div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <div className="whitespace-pre-line rounded-sm border border-line bg-canvas p-4 text-sm leading-relaxed text-ink-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">Answer</p>
                {result.answer}
              </div>

              {result.matchingBills.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Matching Bills ({result.matchingBills.length})
                  </h4>
                  <div className="divide-y divide-line overflow-hidden rounded border border-line">
                    {result.matchingBills.map((bill) => (
                      <Link
                        key={bill.id}
                        to={`/bills/${bill.id}`}
                        onClick={onClose}
                        className="flex items-center justify-between gap-3 p-3 text-xs transition-colors hover:bg-canvas"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-semibold text-ink-900">{bill.billNumber}</span>
                            <span className="text-ink-300">·</span>
                            <span className="truncate font-medium text-ink-700">{bill.vendorName}</span>
                          </div>
                          <div className="mt-0.5 text-ink-500">
                            {bill.subsystem || "Unassigned"} {bill.date ? `· ${formatDate(bill.date)}` : ""}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-semibold text-ink-900">{formatINR(bill.amount)}</span>
                          <StatusBadge status={bill.status as BillStatus} />
                        </div>
                      </Link>
                    ))}
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
