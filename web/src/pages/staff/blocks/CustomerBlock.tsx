import { useState } from "react";
import { api } from "@/api/client";
import { StaffActionFeedback } from "@/components/StaffActionFeedback";
import { ObjectTable } from "@/components/ObjectTable";
import { customerIdParamSchema } from "@/schemas/forms";
import { useStaffFeedback } from "../useStaffFeedback";

export function CustomerBlock() {
  const { error, success, clear, handleErr, ok, showError } = useStaffFeedback();
  const [lookupId, setLookupId] = useState("");
  const [row, setRow] = useState<Record<string, unknown> | null>(null);

  const [cId, setCId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [gender, setGender] = useState("");
  const [marital, setMarital] = useState("S");
  const [ctype, setCtype] = useState("B");

  const [uStreet, setUStreet] = useState("");
  const [uCity, setUCity] = useState("");
  const [uState, setUState] = useState("");
  const [uZip, setUZip] = useState("");

  async function onGet(e: React.FormEvent) {
    e.preventDefault();
    clear();
    const p = customerIdParamSchema.safeParse(lookupId.trim());
    if (!p.success) {
      showError("Enter a valid customer ID.");
      setRow(null);
      return;
    }
    try {
      const { data } = await api.get(`/api/customers/${p.data}`);
      setRow(data as Record<string, unknown>);
      ok("Record loaded.");
    } catch (e) {
      handleErr(e);
      setRow(null);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    clear();
    const id = Number(cId);
    if (!Number.isInteger(id) || id <= 0) {
      showError("Customer ID must be a positive integer.");
      return;
    }
    try {
      await api.post("/api/customers", {
        customer_id: id,
        first_name: firstName,
        last_name: lastName,
        street_address: street,
        city,
        state,
        zip_code: zip,
        gender: gender || null,
        marital_status: marital,
        customer_type: ctype,
      });
      ok("Customer created.");
    } catch (e) {
      handleErr(e);
    }
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    clear();
    const p = customerIdParamSchema.safeParse(lookupId.trim());
    if (!p.success) {
      showError("Enter the customer ID in the lookup field above first.");
      return;
    }
    try {
      await api.put(`/api/customers/${p.data}`, {
        street_address: uStreet,
        city: uCity,
        state: uState,
        zip_code: uZip,
      });
      ok("Mailing address updated.");
      const { data } = await api.get(`/api/customers/${p.data}`);
      setRow(data as Record<string, unknown>);
    } catch (e) {
      handleErr(e);
    }
  }

  return (
    <div className="workspace-section">
      <h3 className="section-title">Customers</h3>
      <StaffActionFeedback error={error} success={success} />

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Look up by customer ID</h4>
        <form onSubmit={(e) => void onGet(e)} className="form-inline-end">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Customer ID</label>
            <input value={lookupId} onChange={(e) => setLookupId(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>
        <ObjectTable data={row} />
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>New customer (employees)</h4>
        <form onSubmit={(e) => void onCreate(e)}>
          <div className="field-grid">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Customer ID</label>
              <input value={cId} onChange={(e) => setCId(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Street address</label>
              <input value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>State (2-letter)</label>
              <input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>ZIP code</label>
              <input value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Gender (M / F, optional)</label>
              <input value={gender} onChange={(e) => setGender(e.target.value)} maxLength={1} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Marital status</label>
              <select value={marital} onChange={(e) => setMarital(e.target.value)}>
                <option value="M">Married (M)</option>
                <option value="S">Single (S)</option>
                <option value="W">Widowed (W)</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Customer type (A / H / B)</label>
              <select value={ctype} onChange={(e) => setCtype(e.target.value)}>
                <option value="A">A</option>
                <option value="H">H</option>
                <option value="B">B</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Create
          </button>
        </form>
      </div>

      <div className="card">
        <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>
          Update mailing address (uses customer ID from lookup above)
        </h4>
        <form onSubmit={(e) => void onUpdate(e)}>
          <div className="field-grid">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Street address</label>
              <input value={uStreet} onChange={(e) => setUStreet(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>City</label>
              <input value={uCity} onChange={(e) => setUCity(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>State (2-letter)</label>
              <input value={uState} onChange={(e) => setUState(e.target.value)} maxLength={2} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>ZIP code</label>
              <input value={uZip} onChange={(e) => setUZip(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Save address
          </button>
        </form>
      </div>
    </div>
  );
}
