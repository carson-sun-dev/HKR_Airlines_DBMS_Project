import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function EmployeeRoute({ children }: { children: ReactNode }) {
  const { role, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== "E") return <Navigate to="/" replace />;
  return <>{children}</>;
}
