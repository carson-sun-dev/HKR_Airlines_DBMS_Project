import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { registerSchema } from "@/schemas/forms";

function toRegisterBody(values: {
  username: string;
  password: string;
  role: "C" | "E";
  customer_id?: string;
}) {
  if (values.role === "E") {
    return { username: values.username, password: values.password, role: "E", customer_id: null };
  }
  const id = Number(String(values.customer_id).trim());
  return { username: values.username, password: values.password, role: "C", customer_id: id };
}

export function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"C" | "E">("C");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = registerSchema.safeParse({
      username,
      password,
      role,
      customer_id: role === "C" ? customerId : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.errors.map((x) => x.message).join("; "));
      return;
    }
    try {
      await api.post("/api/register", toRegisterBody(parsed.data));
      setSuccess("Registration successful. You can sign in now.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(String(msg ?? "Registration failed"));
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
      <div className="card" style={{ width: "100%", maxWidth: 440 }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.35rem" }}>Create account</h1>
        <p className="card-muted" style={{ marginBottom: "1.25rem" }}>
          <strong>HKR Insurance</strong>. Policyholders must already exist in our system. Enter your customer ID from your welcome
          letter or prior correspondence. Employees should select the employee role and leave customer ID blank.
        </p>
        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label htmlFor="ru">Username</label>
            <input id="ru" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="rp">Password</label>
            <input
              id="rp"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="rr">Account type</label>
            <select id="rr" value={role} onChange={(e) => setRole(e.target.value as "C" | "E")}>
              <option value="C">Policyholder</option>
              <option value="E">Employee (internal)</option>
            </select>
          </div>
          {role === "C" ? (
            <div className="field">
              <label htmlFor="rc">Customer ID (must match your record)</label>
              <input
                id="rc"
                inputMode="numeric"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            Register
          </button>
        </form>
        <p style={{ marginTop: "1.25rem", textAlign: "center" }} className="card-muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
