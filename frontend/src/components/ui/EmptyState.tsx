import { Inbox } from "lucide-react";

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed border-line px-4 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink-300">
        <Inbox className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
    </div>
  );
}
