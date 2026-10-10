import clsx from "clsx";
import type { InventoryStats } from "../../types";
import {
  Boxes,
  Users,
  UserCheck,
  AlertOctagon,
  ShoppingCart,
  Wrench,
} from "lucide-react";

interface Props {
  stats: InventoryStats | null;
  activeFilter: string;
  onSelectFilter: (filterKey: string) => void;
}

export function InventoryStatsCards({ stats, activeFilter, onSelectFilter }: Props) {
  const cards = [
    {
      id: "ALL",
      label: "Total Assets",
      count: stats?.total ?? 0,
      icon: Boxes,
      color: "text-ink-900",
      bgHover: "hover:border-ink-500/50",
      description: "Tracked workshop components",
    },
    {
      id: "ASSIGNED_ALL",
      label: "Shared (All)",
      count: stats?.assignedAll ?? 0,
      icon: Users,
      color: "text-emerald-700",
      bgHover: "hover:border-emerald-500/50",
      description: "Assigned to all members",
    },
    {
      id: "ASSIGNED_INDIVIDUAL",
      label: "Individual",
      count: stats?.assignedIndividual ?? 0,
      icon: UserCheck,
      color: "text-indigo-700",
      bgHover: "hover:border-indigo-500/50",
      description: "Assigned to specific member",
    },
    {
      id: "INSTALLED",
      label: "On Vehicle",
      count: stats?.installed ?? 0,
      icon: Wrench,
      color: "text-sky-700",
      bgHover: "hover:border-sky-500/50",
      description: "Mounted on car / chassis",
    },
    {
      id: "MISSING",
      label: "Missing Items",
      count: stats?.missing ?? 0,
      icon: AlertOctagon,
      color: stats?.missing && stats.missing > 0 ? "text-rose-600" : "text-ink-500",
      bgHover: "hover:border-rose-500/50",
      isAlert: (stats?.missing ?? 0) > 0,
      description: "Items flagged missing",
    },
    {
      id: "TO_BUY",
      label: "To-Buy Needed",
      count: stats?.toBuyPending ?? 0,
      icon: ShoppingCart,
      color: "text-amber-700",
      bgHover: "hover:border-amber-500/50",
      description: "Pending procurement",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter(card.id)}
            className={clsx(
              "group relative flex flex-col justify-between rounded-lg border p-3.5 text-left transition-all duration-200",
              isSelected
                ? "border-accent bg-accent/5 shadow-subtle ring-1 ring-accent"
                : card.isAlert
                ? "border-rose-300 bg-rose-50/40 shadow-xs hover:border-rose-400"
                : "border-line bg-surface shadow-subtle hover:bg-canvas/60",
              card.bgHover
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                {card.label}
              </span>
              <div
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-transform duration-200 group-hover:scale-110",
                  card.isAlert
                    ? "bg-rose-100 text-rose-700"
                    : isSelected
                    ? "bg-accent text-white"
                    : "bg-canvas text-ink-700"
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className={clsx("text-2xl font-bold tracking-tight", card.color)}>
                {card.count}
              </span>
              {card.isAlert && (
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>

            <p className="mt-1 line-clamp-1 text-[10px] text-ink-400">
              {card.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
