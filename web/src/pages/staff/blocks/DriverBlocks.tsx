import { useState } from "react";
import { api } from "@/api/client";
import { StaffActionFeedback } from "@/components/StaffActionFeedback";
import { ObjectTable } from "@/components/ObjectTable";
import { apiDelete, useStaffFeedback } from "../useStaffFeedback";

function numId(raw: string): number | null {
  const n = Number(raw.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function DriverBlocks() {
  const fb = useStaffFeedback();
  const { error, success } = fb;

  const [did, setDid] = useState("");
  const [dRow, setDRow] = useState<Record<string, unknown> | null>(null);
  const [dNewId, setDNewId] = useState("");
  const [dLic, setDLic] = useState("");
  const [dFn, setDFn] = useState("");
  const [dLn, setDLn] = useState("");
  const [dAge, setDAge] = useState("");
  const [dFnU, setDFnU] = useState("");
  const [dLnU, setDLnU] = useState("");
  const [dAgeU, setDAgeU] = useState("");

  async function getDrv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(did);
    if (!id) return fb.showError("Enter a driver ID.");
    try {
      const { data } = await api.get(`/api/drivers/${id}`);
      setDRow(data as Record<string, unknown>);
      fb.ok("Driver loaded.");
    } catch (e) {
      fb.handleErr(e);
      setDRow(null);
    }
  }

  async function createDrv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    try {
      await api.post("/api/drivers", {
        driver_id: Number(dNewId),
        license_number: dLic,
        first_name: dFn,
        last_name: dLn,
        age: Number(dAge),
      });
      fb.ok("Driver created.");
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function updateDrv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(did);
    if (!id) return;
    try {
      await api.put(`/api/drivers/${id}`, {
        first_name: dFnU,
        last_name: dLnU,
        age: Number(dAgeU),
      });
      fb.ok("Updated.");
      const { data } = await api.get(`/api/drivers/${id}`);
      setDRow(data as Record<string, unknown>);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function deleteDrv() {
    fb.clear();
    const id = numId(did);
    if (!id) return;
    try {
      await apiDelete(`/api/drivers/${id}`);
      fb.ok("Deleted.");
      setDRow(null);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  const [linkD, setLinkD] = useState("");
  const [linkV, setLinkV] = useState("");

  async function linkDv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    try {
      await api.post("/api/driver_vehicle", {
        driver_id: Number(linkD),
        vehicle_id: Number(linkV),
      });
      fb.ok("Driver linked to vehicle.");
    } catch (e) {
      fb.handleErr(e);
    }
  }

  return (
    <div className="workspace-section">
      <h3 className="section-title">Drivers & assignments</h3>
      <StaffActionFeedback error={error} success={success} />

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Driver</h4>
        <form onSubmit={(e) => void getDrv(e)} className="form-search-row">
          <input placeholder="Driver ID" value={did} onChange={(e) => setDid(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => void deleteDrv()}>
            Delete
          </button>
        </form>
        <ObjectTable data={dRow} />
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>New driver</summary>
          <form onSubmit={(e) => void createDrv(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>New driver ID</label>
                <input value={dNewId} onChange={(e) => setDNewId(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>License number</label>
                <input value={dLic} onChange={(e) => setDLic(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>First name</label>
                <input value={dFn} onChange={(e) => setDFn(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Last name</label>
                <input value={dLn} onChange={(e) => setDLn(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Age</label>
                <input value={dAge} onChange={(e) => setDAge(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Submit
            </button>
          </form>
        </details>
        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Update name & age</summary>
          <form onSubmit={(e) => void updateDrv(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>First name</label>
                <input value={dFnU} onChange={(e) => setDFnU(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Last name</label>
                <input value={dLnU} onChange={(e) => setDLnU(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Age</label>
                <input value={dAgeU} onChange={(e) => setDAgeU(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </form>
        </details>
      </div>

      <div className="card">
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Link driver to vehicle</h4>
        <form onSubmit={(e) => void linkDv(e)} className="form-inline-end">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Driver ID</label>
            <input value={linkD} onChange={(e) => setLinkD(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Vehicle ID</label>
            <input value={linkV} onChange={(e) => setLinkV(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Link
          </button>
        </form>
      </div>
    </div>
  );
}
