import { useState } from "react";
import { api } from "@/api/client";
import { ObjectTable } from "@/components/ObjectTable";
import { apiDelete, useStaffFeedback } from "../useStaffFeedback";

function numId(raw: string): number | null {
  const n = Number(raw.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

const HT = ["C", "M", "S", "T"] as const;
const VS = ["F", "L", "O"] as const;

export function PropertyBlocks() {
  const fb = useStaffFeedback();
  const { error, success } = fb;

  const [hid, setHid] = useState("");
  const [hRow, setHRow] = useState<Record<string, unknown> | null>(null);
  const [hIid, setHIid] = useState("");
  const [hPd, setHPd] = useState("");
  const [hPv, setHPv] = useState("");
  const [hArea, setHArea] = useState("");
  const [hType, setHType] = useState<(typeof HT)[number]>("S");
  const [hFire, setHFire] = useState("1");
  const [hSec, setHSec] = useState("1");
  const [hPool, setHPool] = useState("");
  const [hBase, setHBase] = useState("1");
  const [hPol, setHPol] = useState("");
  const [hPvU, setHPvU] = useState("");
  const [hFireU, setHFireU] = useState("1");
  const [hSecU, setHSecU] = useState("1");
  const [hPoolU, setHPoolU] = useState("");
  const [hBaseU, setHBaseU] = useState("1");

  async function getHome(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(hid);
    if (!id) return fb.showError("Enter an insured home ID.");
    try {
      const { data } = await api.get(`/api/insured_homes/${id}`);
      setHRow(data as Record<string, unknown>);
      fb.ok("Insured home loaded.");
    } catch (e) {
      fb.handleErr(e);
      setHRow(null);
    }
  }

  async function createHome(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    try {
      const body: Record<string, unknown> = {
        home_id: Number(hIid),
        purchase_date: hPd,
        purchase_value: Number(hPv),
        area_sq_ft: Number(hArea),
        home_type: hType,
        auto_fire_notification: hFire,
        home_security_system: hSec,
        basement: hBase,
        home_policy_id: Number(hPol),
      };
      if (hPool.trim()) body.swimming_pool = hPool;
      else body.swimming_pool = null;
      await api.post("/api/insured_homes", body);
      fb.ok("Insured home created.");
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function updateHome(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(hid);
    if (!id) return;
    try {
      const body: Record<string, unknown> = {
        purchase_value: Number(hPvU),
        auto_fire_notification: hFireU,
        home_security_system: hSecU,
        basement: hBaseU,
      };
      body.swimming_pool = hPoolU.trim() ? hPoolU : null;
      await api.put(`/api/insured_homes/${id}`, body);
      fb.ok("Updated.");
      const { data } = await api.get(`/api/insured_homes/${id}`);
      setHRow(data as Record<string, unknown>);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function deleteHome() {
    fb.clear();
    const id = numId(hid);
    if (!id) return;
    try {
      await apiDelete(`/api/insured_homes/${id}`);
      fb.ok("Deleted.");
      setHRow(null);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  const [vid, setVid] = useState("");
  const [vRow, setVRow] = useState<Record<string, unknown> | null>(null);
  const [vVid, setVVid] = useState("");
  const [vVin, setVVin] = useState("");
  const [vMm, setVMm] = useState("");
  const [vStat, setVStat] = useState<(typeof VS)[number]>("O");
  const [vPol, setVPol] = useState("");
  const [vStatU, setVStatU] = useState<(typeof VS)[number]>("O");

  async function getVeh(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(vid);
    if (!id) return fb.showError("Enter an insured vehicle ID.");
    try {
      const { data } = await api.get(`/api/insured_vehicles/${id}`);
      setVRow(data as Record<string, unknown>);
      fb.ok("Insured vehicle loaded.");
    } catch (e) {
      fb.handleErr(e);
      setVRow(null);
    }
  }

  async function createVeh(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    try {
      await api.post("/api/insured_vehicles", {
        vehicle_id: Number(vVid),
        vin: vVin,
        make_model_year: vMm,
        vehicle_status: vStat,
        auto_policy_id: Number(vPol),
      });
      fb.ok("Insured vehicle created.");
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function updateVeh(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(vid);
    if (!id) return;
    try {
      await api.put(`/api/insured_vehicles/${id}`, { vehicle_status: vStatU });
      fb.ok("Updated.");
      const { data } = await api.get(`/api/insured_vehicles/${id}`);
      setVRow(data as Record<string, unknown>);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function deleteVeh() {
    fb.clear();
    const id = numId(vid);
    if (!id) return;
    try {
      await apiDelete(`/api/insured_vehicles/${id}`);
      fb.ok("Deleted.");
      setVRow(null);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  return (
    <div className="workspace-section">
      <h3 className="section-title">Scheduled property — homes & vehicles</h3>
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Insured home</h4>
        <form onSubmit={(e) => void getHome(e)} className="form-search-row">
          <input placeholder="Home ID" value={hid} onChange={(e) => setHid(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => void deleteHome()}>
            Delete
          </button>
        </form>
        <ObjectTable data={hRow} />
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>New insured home</summary>
          <form onSubmit={(e) => void createHome(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>New home ID</label>
                <input value={hIid} onChange={(e) => setHIid(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Purchase date</label>
                <input type="date" value={hPd} onChange={(e) => setHPd(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Purchase value (USD)</label>
                <input value={hPv} onChange={(e) => setHPv(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Area (sq ft)</label>
                <input value={hArea} onChange={(e) => setHArea(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Home type (code)</label>
                <select value={hType} onChange={(e) => setHType(e.target.value as (typeof HT)[number])}>
                  {HT.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Fire notification (0 / 1)</label>
                <select value={hFire} onChange={(e) => setHFire(e.target.value)}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Security system (0 / 1)</label>
                <select value={hSec} onChange={(e) => setHSec(e.target.value)}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Pool code (blank if none)</label>
                <input placeholder="U / O / I / M" value={hPool} onChange={(e) => setHPool(e.target.value)} maxLength={1} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Basement (0 / 1)</label>
                <select value={hBase} onChange={(e) => setHBase(e.target.value)}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Home policy ID</label>
                <input value={hPol} onChange={(e) => setHPol(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Submit
            </button>
          </form>
        </details>
        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Update home</summary>
          <form onSubmit={(e) => void updateHome(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Purchase value (USD)</label>
                <input value={hPvU} onChange={(e) => setHPvU(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Fire notification</label>
                <select value={hFireU} onChange={(e) => setHFireU(e.target.value)}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Security system</label>
                <select value={hSecU} onChange={(e) => setHSecU(e.target.value)}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Pool code</label>
                <input value={hPoolU} onChange={(e) => setHPoolU(e.target.value)} maxLength={1} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Basement</label>
                <select value={hBaseU} onChange={(e) => setHBaseU(e.target.value)}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </form>
        </details>
      </div>

      <div className="card">
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Insured vehicle</h4>
        <form onSubmit={(e) => void getVeh(e)} className="form-search-row">
          <input placeholder="Vehicle ID" value={vid} onChange={(e) => setVid(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => void deleteVeh()}>
            Delete
          </button>
        </form>
        <ObjectTable data={vRow} />
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>New vehicle (17-char VIN)</summary>
          <form onSubmit={(e) => void createVeh(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>New vehicle ID</label>
                <input value={vVid} onChange={(e) => setVVid(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>VIN</label>
                <input value={vVin} onChange={(e) => setVVin(e.target.value)} maxLength={17} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Make / model / year</label>
                <input value={vMm} onChange={(e) => setVMm(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Vehicle status (code)</label>
                <select value={vStat} onChange={(e) => setVStat(e.target.value as (typeof VS)[number])}>
                  {VS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Auto policy ID</label>
                <input value={vPol} onChange={(e) => setVPol(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Submit
            </button>
          </form>
        </details>
        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Update vehicle status only</summary>
          <form onSubmit={(e) => void updateVeh(e)} className="form-inline-end" style={{ marginTop: "0.5rem" }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>New status</label>
              <select value={vStatU} onChange={(e) => setVStatU(e.target.value as (typeof VS)[number])}>
                {VS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
