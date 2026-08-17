import { useState } from "react";
import { Link } from "react-router-dom";
import { queryBillsAi, type AiQueryResult } from "../../api/analytics";
import { StatusBadge } from "./StatusBadge";
import { formatINR, formatDate } from "../../utils/format";

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

  if (!isOpen) return null;

  async function handleSearch(searchQuery: string) {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await queryBillsAi(searchQuery);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to query AI Assistant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-canvas/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink-900">AI Bill Assistant</h3>
              <p className="text-xs text-ink-500">Ask natural language questions about bills, spend & vendors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-canvas hover:text-ink-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Query Input */}
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
              placeholder="e.g. Total spent on Powertrain this month..."
              className="w-full rounded-lg border border-line bg-canvas px-4 py-3 pr-24 text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Analyzing..." : "Ask AI"}
            </button>
          </form>

          {/* Quick Prompts */}
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
                    className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-accent/50 hover:bg-accent/5 hover:text-accent transition-colors"
                  >
                    ✨ {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center justify-center py-8 text-center">
              <div className="space-y-3">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <p className="text-sm font-medium text-ink-600">Querying Gemini AI across team bill records...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {/* AI Response Output */}
          {result && !loading && (
            <div className="space-y-4">
              <div className="rounded-lg border border-line bg-canvas p-4 text-sm text-ink-800 leading-relaxed whitespace-pre-line">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-accent">
                  <span>AI Summary</span>
                </div>
                {result.answer}
              </div>

              {/* Matching Bills List */}
              {result.matchingBills.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Matching Bills ({result.matchingBills.length})
                  </h4>
                  <div className="divide-y divide-line rounded-lg border border-line bg-surface overflow-hidden">
                    {result.matchingBills.map((bill) => (
                      <Link
                        key={bill.id}
                        to={`/bills/${bill.id}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-3 text-xs hover:bg-canvas transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink-900">{bill.billNumber}</span>
                            <span className="text-ink-500">•</span>
                            <span className="font-medium text-ink-700">{bill.vendorName}</span>
                          </div>
                          <div className="mt-0.5 text-ink-400">
                            {bill.subsystem || "Unassigned"} {bill.date ? `• ${formatDate(bill.date)}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-ink-900">{formatINR(bill.amount)}</span>
                          <StatusBadge status={bill.status as any} />
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
