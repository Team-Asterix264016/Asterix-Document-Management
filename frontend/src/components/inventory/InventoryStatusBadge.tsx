import clsx from "clsx";
import type { InventoryStatus } from "../../types";
import { CheckCircle2, UserCheck, Wrench, AlertTriangle, AlertOctagon } from "lucide-react";

interface Props {
  status: InventoryStatus;
  size?: "sm" | "md";
  showAvailable?: boolean;
}

export function InventoryStatusBadge({ status, size = "md", showAvailable = false }: Props) {
  const isSm = size === "sm";

  switch (status) {
    case "AVAILABLE":
      if (!showAvailable) return null;
      return (
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide",
            "border border-emerald-500/20 bg-emerald-50 text-emerald-800",
            isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
          )}
        >
          <CheckCircle2 className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Available
        </span>
      );

    case "CHECKED_OUT":
      return (
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide",
            "border border-indigo-500/20 bg-indigo-50 text-indigo-800",
            isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
          )}
        >
          <UserCheck className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
          In Use
        </span>
      );

    case "INSTALLED":
      return (
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide",
            "border border-sky-500/20 bg-sky-50 text-sky-800",
            isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
          )}
        >
          <Wrench className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
          On Vehicle
        </span>
      );

    case "MISSING":
      return (
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide",
            "border border-rose-500/30 bg-rose-50 text-rose-800 shadow-xs",
            isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" />
          </span>
          <AlertOctagon className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Missing
        </span>
      );

    case "DAMAGED":
      return (
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide",
            "border border-amber-500/20 bg-amber-50 text-amber-800",
            isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
          )}
        >
          <AlertTriangle className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Damaged
        </span>
      );

    default:
      return (
        <span className="badge border border-line bg-surface text-ink-500">
          {status}
        </span>
      );
  }
}
