import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Spinner } from "./components/ui/Spinner";
import { Login } from "./pages/Login";

// Route-level code splitting keeps the first load small (charts and heavy pages load on demand).
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Bills = lazy(() => import("./pages/Bills").then((m) => ({ default: m.Bills })));
const BillDetails = lazy(() => import("./pages/BillDetails").then((m) => ({ default: m.BillDetails })));
const AddBill = lazy(() => import("./pages/AddBill").then((m) => ({ default: m.AddBill })));
const Approval = lazy(() => import("./pages/Approval").then((m) => ({ default: m.Approval })));
const Reports = lazy(() => import("./pages/Reports").then((m) => ({ default: m.Reports })));
const Analytics = lazy(() => import("./pages/Analytics").then((m) => ({ default: m.Analytics })));
const Users = lazy(() => import("./pages/Users").then((m) => ({ default: m.Users })));

function PageFallback() {
  return (
    <div className="flex justify-center py-24">
      <Spinner />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/bills" element={<Bills />} />
                  <Route path="/bills/new" element={<AddBill />} />
                  <Route path="/bills/:id" element={<BillDetails />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/analytics" element={<Analytics />} />

                  <Route element={<ProtectedRoute allow={["TREASURER"]} />}>
                    <Route path="/approval" element={<Approval />} />
                  </Route>

                  <Route element={<ProtectedRoute allow={["ADMIN"]} />}>
                    <Route path="/users" element={<Users />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
