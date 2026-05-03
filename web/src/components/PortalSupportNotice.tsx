import { useAuth } from "@/context/AuthContext";

/** Static professional copy for policyholder vs. internal staff experience. */
export function PortalSupportNotice() {
  const { role } = useAuth();

  if (role === "C") {
    return (
      <div
        className="support-notice"
        style={{
          fontSize: "0.82rem",
          lineHeight: 1.5,
          padding: "0.65rem 0.85rem",
          marginBottom: "0.85rem",
          borderRadius: 8,
          border: "1px solid rgba(14, 165, 233, 0.35)",
          background: "rgba(255, 255, 255, 0.92)",
          color: "var(--text-muted)",
        }}
      >
        Questions about coverage, billing, or updates you cannot complete online? Please contact{" "}
        <strong style={{ color: "var(--text)" }}>your dedicated HKR account administrator</strong>.
      </div>
    );
  }

  if (role === "E") {
    return (
      <div
        className="support-notice support-notice--internal"
        style={{
          fontSize: "0.8rem",
          lineHeight: 1.45,
          padding: "0.55rem 0.75rem",
          marginBottom: "0.75rem",
          borderRadius: 8,
          border: "1px solid rgba(100, 116, 139, 0.25)",
          background: "rgba(248, 250, 252, 0.95)",
          color: "var(--text-muted)",
        }}
      >
        Authorized personnel only. Customer-facing changes should follow company procedures and may require coordination with the policyholder’s assigned account administrator.
      </div>
    );
  }

  return null;
}
