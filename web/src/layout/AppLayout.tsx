import { NavLink, Outlet } from "react-router-dom";
import { PortalSupportNotice } from "@/components/PortalSupportNotice";
import { useAuth } from "@/context/AuthContext";

export function AppLayout() {
  const { role, logout } = useAuth();

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `btn ${isActive ? "btn-primary" : "btn-ghost"}`;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="layout-sidebar"
        style={{
          width: 244,
          margin: "1rem",
          marginRight: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.45rem",
          alignSelf: "flex-start",
          position: "sticky",
          top: "1rem",
          padding: "1rem 1rem 1.1rem",
        }}
      >
        <div style={{ marginBottom: "0.35rem" }}>
          <strong style={{ fontSize: "1.08rem", color: "var(--text)" }}>HKR Insurance</strong>
          <div className="card-muted" style={{ marginTop: "0.35rem", fontSize: "0.82rem" }}>
            {role === "E" ? "Operations console" : "Policyholder portal"}
          </div>
        </div>
        <NavLink to="/" end className={navCls}>
          Home
        </NavLink>
        {role === "E" ? (
          <>
            <NavLink to="/manage" className={navCls}>
              Admin &amp; policies
            </NavLink>
            <NavLink to="/customers/lookup" className={navCls}>
              Customer lookup
            </NavLink>
          </>
        ) : null}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
          Sign out
        </button>
      </aside>
      <main style={{ flex: 1, padding: "1rem", overflow: "auto", background: "transparent" }}>
        <PortalSupportNotice />
        <Outlet />
      </main>
    </div>
  );
}
