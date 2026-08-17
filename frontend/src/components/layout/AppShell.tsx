import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import clsx from "clsx";

const MEMBER_NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/bills", label: "Bills" },
  { to: "/bills/new", label: "Add Bill" },
  { to: "/reports", label: "Reports" },
  { to: "/analytics", label: "Analytics" },
];

const TREASURER_NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/approval", label: "Pending Approval" },
  { to: "/bills", label: "Bills" },
  { to: "/reports", label: "Reports" },
  { to: "/analytics", label: "Analytics" },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navItems = user?.role === "TREASURER" ? TREASURER_NAV : MEMBER_NAV;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-line px-5 py-6 md:flex">
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Asterix A-BAJA 2027</p>
            <p className="mt-0.5 text-sm font-semibold text-ink-900">Bill Management</p>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-accent-soft text-accent" : "text-ink-700 hover:bg-canvas hover:text-ink-900"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-line pt-4">
            <p className="text-sm font-medium text-ink-900">{user?.displayName}</p>
            <p className="text-xs text-ink-500">{user?.role === "TREASURER" ? "Treasurer" : "Member"}</p>
            <button onClick={logout} className="mt-3 text-sm font-medium text-ink-500 hover:text-ink-900">
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
            <p className="text-sm font-semibold text-ink-900">Asterix A-BAJA 2027</p>
            <button onClick={logout} className="text-sm font-medium text-ink-500">
              Sign out
            </button>
          </header>

          <main className="flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
            <Outlet />
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
                    isActive ? "text-accent" : "text-ink-500"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
