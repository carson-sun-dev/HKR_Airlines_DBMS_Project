import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CustomerLookupPage } from "@/pages/CustomerLookupPage";
import { StaffWorkspace } from "@/pages/StaffWorkspace";
import { EmployeeReportDatasetPage } from "@/pages/EmployeeReportDatasetPage";
import { EmployeeRoute } from "@/components/EmployeeRoute";

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="customers/lookup" element={<CustomerLookupPage />} />
        <Route
          path="manage"
          element={
            <EmployeeRoute>
              <StaffWorkspace />
            </EmployeeRoute>
          }
        />
        <Route
          path="reports/:dataset"
          element={
            <EmployeeRoute>
              <EmployeeReportDatasetPage />
            </EmployeeRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
