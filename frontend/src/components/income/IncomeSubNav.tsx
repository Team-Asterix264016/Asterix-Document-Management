import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  LayoutDashboard,
  CalendarCheck,
  GraduationCap,
  Award,
  WalletCards,
} from "lucide-react";

interface SubNavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const SUB_NAV_ITEMS: SubNavItem[] = [
  { to: "/income", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/income/installments", label: "Team Installments", icon: CalendarCheck },
  { to: "/income/events", label: "Workshops & Events", icon: GraduationCap },
  { to: "/income/sponsors", label: "Sponsorships", icon: Award },
  { to: "/income/misc", label: "Miscellaneous", icon: WalletCards },
];

export function IncomeSubNav() {
  return (
    <div className="border-b border-line pb-1">
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        {SUB_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                "group flex items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold transition-all duration-150",
                isActive
                  ? "bg-accent text-white shadow-subtle"
                  : "bg-surface text-ink-600 hover:bg-surface-hover hover:text-ink-900 border border-line"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={clsx(
                    "h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "text-white" : "text-ink-500 group-hover:text-ink-700"
                  )}
                  strokeWidth={2}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
