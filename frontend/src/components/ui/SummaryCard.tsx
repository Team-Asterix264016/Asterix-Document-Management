export function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "default" | "warn" }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className={`text-2xl font-semibold tracking-tight sm:text-3xl ${tone === "warn" ? "text-status-pending" : "text-ink-900"}`}>{value}</p>
      <p className="mt-1 text-sm text-ink-500">{label}</p>
    </div>
  );
}
