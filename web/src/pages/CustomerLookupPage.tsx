import { useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { ObjectTable } from "@/components/ObjectTable";
import { customerIdParamSchema } from "@/schemas/forms";

/** Staff: look up a customer by ID. Policyholders are redirected (they use Home). */
export function CustomerLookupPage() {
  const { role } = useAuth();
  const [rawId, setRawId] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  if (role === "C") {
    return <Navigate to="/" replace />;
  }

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResult(null);
    const idParsed = customerIdParamSchema.safeParse(rawId.trim());
    if (!idParsed.success) {
      setError("Enter a valid positive integer customer ID.");
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get(`/api/customers/${idParsed.data}`);
      setResult(data as Record<string, unknown>);
      setSuccess("Customer record loaded.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(String(msg ?? "Customer not found or access denied."));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem" }}>Customer lookup</h2>
        <p className="card-muted" style={{ margin: 0 }}>
          Enter a customer ID to view name, mailing address, and related profile fields.
        </p>
      </div>
      <div className="card">
        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}
        <form onSubmit={(e) => void onLookup(e)} className="form-inline-end">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="cid">Customer ID</label>
            <input id="cid" inputMode="numeric" value={rawId} onChange={(e) => setRawId(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
        <ObjectTable data={result} />
      </div>
    </div>
  );
}
