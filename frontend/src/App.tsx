import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Bills } from "./pages/Bills";
import { BillDetails } from "./pages/BillDetails";
import { AddBill } from "./pages/AddBill";
import { Approval } from "./pages/Approval";
import { Reports } from "./pages/Reports";
import { Analytics } from "./pages/Analytics";

import { Users } from "./pages/Users";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
