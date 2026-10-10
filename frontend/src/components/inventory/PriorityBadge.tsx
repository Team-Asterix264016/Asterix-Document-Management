import clsx from "clsx";
import type { ToBuyPriority } from "../../types";
import { Flame, AlertCircle, Clock, Check } from "lucide-react";

interface Props {
  priority: ToBuyPriority;
}

export function PriorityBadge({ priority }: Props) {
  switch (priority) {
    case "URGENT":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-700 shadow-xs">
          <Flame className="h-3 w-3 text-red-600 animate-pulse" />
          Urgent
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
          <AlertCircle className="h-3 w-3 text-amber-600" />
          High
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-blue-700">
          <Clock className="h-3 w-3 text-blue-500" />
          Medium
        </span>
      );
    case "LOW":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-500">
          <Check className="h-3 w-3 text-ink-300" />
          Low
        </span>
      );
    default:
      return null;
  }
}
