import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import clsx from "clsx";
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  FileBarChart2,
  BarChart3,
  ClipboardCheck,
  LogOut,
  Sparkles,
} from "lucide-react";
import { AiAssistantModal } from "../ui/AiAssistantModal";

const MEMBER_NAV = [
  { to: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { to: "/bills", label: "Bills", shortLabel: "Bills", icon: Receipt },
  { to: "/bills/new", label: "Add Bill", shortLabel: "Add", icon: PlusCircle },
  { to: "/reports", label: "Reports", shortLabel: "Reports", icon: FileBarChart2 },
  { to: "/analytics", label: "Analytics", shortLabel: "Stats", icon: BarChart3 },
];

const TREASURER_NAV = [
  { to: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { to: "/approval", label: "Pending Approval", shortLabel: "Approve", icon: ClipboardCheck },
  { to: "/bills", label: "Bills", shortLabel: "Bills", icon: Receipt },
  { to: "/reports", label: "Reports", shortLabel: "Reports", icon: FileBarChart2 },
  { to: "/analytics", label: "Analytics", shortLabel: "Stats", icon: BarChart3 },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const navItems = user?.role === "TREASURER" ? TREASURER_NAV : MEMBER_NAV;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-line px-5 py-6 md:flex">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Asterix A-BAJA 2027</p>
            <p className="mt-0.5 text-sm font-semibold text-ink-900">Bill Management</p>
          </div>

          {/* AI Assistant Button */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs font-semibold text-accent transition-all hover:bg-accent/15 hover:shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Ask AI Assistant
          </button>

          <nav className="flex flex-1 flex-col gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/" || item.to === "/bills"}
                className={({ isActive }) =>
                  clsx(
                    "group flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-accent-soft text-accent" : "text-ink-700 hover:bg-canvas hover:text-ink-900"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={clsx("h-4 w-4 shrink-0 transition-colors", isActive ? "text-accent" : "text-ink-500 group-hover:text-ink-700")}
                      strokeWidth={2}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-line pt-4">
            <p className="text-sm font-medium text-ink-900">{user?.displayName}</p>
            <p className="text-xs text-ink-500">{user?.role === "TREASURER" ? "Treasurer" : "Member"}</p>
            <button
              onClick={logout}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
            <p className="text-sm font-semibold text-ink-900">Asterix A-BAJA 2027</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI
              </button>
              <button onClick={logout} aria-label="Sign out" className="rounded-sm p-1.5 text-ink-500 transition-colors hover:bg-canvas hover:text-ink-900">
                <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-28 sm:px-6 md:pb-6 lg:px-8">
            <div key={location.pathname} className="animate-fade-up">
              <Outlet />
            </div>
          </main>

          <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/" || item.to === "/bills"}
                className={({ isActive }) =>
                  clsx(
                    "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    isActive ? "text-accent" : "text-ink-500"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                    {item.shortLabel}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <AiAssistantModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
    </div>
  );
}
