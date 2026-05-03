import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { loginSchema } from "@/schemas/forms";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.errors.map((x) => x.message).join("; "));
      return;
    }
    setSubmitting(true);
    try {
      const res = await login(parsed.data.username, parsed.data.password, rememberMe);
      if (!res.ok) setError(res.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1rem",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.35rem" }}>Sign in</h1>
        <p className="card-muted" style={{ marginBottom: "1.25rem" }}>
          <strong>HKR Insurance</strong> — enter the username and password you registered with.
        </p>
        {error ? <div className="error-banner">{error}</div> : null}
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label htmlFor="u">Username</label>
            <input
              id="u"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="p">Password</label>
            <input
              id="p"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer", fontWeight: 500 }}>
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ marginTop: "0.2rem" }}
              />
              <span>
                Remember me on this device
                <span className="card-muted" style={{ display: "block", fontWeight: 400, fontSize: "0.82rem", marginTop: "0.35rem" }}>
                  Stays signed in after you close the browser. Only use on a trusted computer; tokens are stored in the browser and
                  can be read by scripts on this site, so avoid suspicious extensions and untrusted networks.
                </span>
              </span>
            </label>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={{ marginTop: "1.25rem", textAlign: "center" }} className="card-muted">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
