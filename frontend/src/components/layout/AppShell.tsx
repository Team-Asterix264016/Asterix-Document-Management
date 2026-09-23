import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  Heart,
  Users,
} from "lucide-react";
import { AiAssistantModal } from "../ui/AiAssistantModal";
import { LiveClock } from "./LiveClock";
import { Spinner } from "../ui/Spinner";
import type { User } from "../../types";

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

const ADMIN_NAV = [
  { to: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { to: "/users", label: "Users", shortLabel: "Users", icon: Users },
  { to: "/bills", label: "Bills", shortLabel: "Bills", icon: Receipt },
  { to: "/reports", label: "Reports", shortLabel: "Reports", icon: FileBarChart2 },
  { to: "/analytics", label: "Analytics", shortLabel: "Stats", icon: BarChart3 },
];

const ROLE_LABEL: Record<User["role"], string> = {
  ADMIN: "Admin",
  TREASURER: "Treasurer",
  MEMBER: "Member",
};

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname === "/bills/new") return "Add Bill";
  if (pathname.startsWith("/bills/")) return "Bill Details";
  const map: Record<string, string> = {
    "/bills": "Bills",
    "/approval": "Pending Approval",
    "/reports": "Reports",
    "/analytics": "Analytics",
    "/users": "Users",
  };
  return map[pathname] ?? "Asterix";
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const navItems = user?.role === "ADMIN" ? ADMIN_NAV : user?.role === "TREASURER" ? TREASURER_NAV : MEMBER_NAV;
  const title = pageTitle(location.pathname);
  const roleLabel = user ? ROLE_LABEL[user.role] : "";

  useEffect(() => {
    document.title = `${title} · Asterix Bill Manager`;
  }, [title]);

  // Ctrl/⌘ + K opens the AI assistant from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsAiModalOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-5 py-6 md:flex">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface shadow-subtle">
              <img src="/logo.png" alt="Asterix Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">Asterix A-BAJA '27</p>
              <p className="text-sm font-bold text-ink-900">Bill Manager</p>
            </div>
          </div>

          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-500">Menu</p>
          <nav className="flex flex-1 flex-col gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/" || item.to === "/bills"}
                className={({ isActive }) =>
                  clsx(
                    "group relative flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-accent-soft text-accent" : "text-ink-700 hover:bg-surface hover:text-ink-900"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" aria-hidden />}
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
            <p className="text-[10px] uppercase leading-relaxed tracking-widest text-ink-500">
              Crafted with <Heart className="inline h-3 w-3 -translate-y-px fill-accent text-accent" aria-label="love" /> by
              <br />
              Arya & Rithvin
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop top bar */}
          <header className="sticky top-0 z-30 hidden items-center justify-between gap-4 border-b border-line bg-canvas/90 px-6 py-3 backdrop-blur md:flex lg:px-8">
            <h1 className="min-w-0 truncate text-base font-semibold text-ink-900">{title}</h1>

            <div className="flex items-center gap-3">
              <LiveClock className="rounded-md border border-line bg-surface px-3 py-1.5 shadow-subtle" />

              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:border-accent/50"
                title="Ask AI Assistant (Ctrl+K)"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                Ask AI
                <kbd className="hidden rounded-sm border border-accent/30 bg-surface px-1 font-mono text-[10px] text-accent lg:inline">Ctrl K</kbd>
              </button>

              <div className="h-6 w-px bg-line" aria-hidden />

              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white"
                  aria-hidden
                >
                  {initials(user?.displayName)}
                </div>
                <div className="hidden leading-tight lg:block">
                  <p className="max-w-[160px] truncate text-sm font-medium text-ink-900">{user?.displayName}</p>
                  <p className="text-[11px] text-ink-500">{roleLabel}</p>
                </div>
              </div>

              <button onClick={handleLogout} className="btn-secondary !px-3 !py-1.5 text-xs" title="Sign out">
                <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                Sign out
              </button>
            </div>
          </header>

          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 px-4 py-2.5 backdrop-blur md:hidden">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-surface">
                  <img src="/logo.png" alt="Asterix Logo" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold text-ink-900">{title}</p>
                  <p className="truncate text-[11px] text-ink-500">
                    {user?.displayName} · {roleLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="flex items-center gap-1 rounded-md bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI
                </button>
                <button
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className="flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-700"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                  Sign out
                </button>
              </div>
            </div>
            <LiveClock compact className="mt-1.5 justify-end" />
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-28 sm:px-6 md:pb-6 lg:px-8">
            <div key={location.pathname} className="animate-fade-up">
              <Suspense
                fallback={
                  <div className="flex justify-center py-24">
                    <Spinner />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
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
