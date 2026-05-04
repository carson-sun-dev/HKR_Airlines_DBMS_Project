import { useState } from "react";
import { api } from "@/api/client";
import { StaffActionFeedback } from "@/components/StaffActionFeedback";
import { ObjectTable } from "@/components/ObjectTable";
import { customerIdParamSchema } from "@/schemas/forms";
import { apiDelete, useStaffFeedback } from "../useStaffFeedback";

const PAY = ["PayPal", "Credit", "Debit", "Check"] as const;

const PAY_LABEL: Record<(typeof PAY)[number], string> = {
  PayPal: "PayPal",
  Credit: "Credit card",
  Debit: "Debit card",
  Check: "Check",
};

function numId(raw: string): number | null {
  const n = Number(raw.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function HomeInsuranceBlocks() {
  const fb = useStaffFeedback();
  const { error, success } = fb;

  const [hpId, setHpId] = useState("");
  const [hpRow, setHpRow] = useState<Record<string, unknown> | null>(null);
  const [hpPid, setHpPid] = useState("");
  const [hpStart, setHpStart] = useState("");
  const [hpEnd, setHpEnd] = useState("");
  const [hpPrem, setHpPrem] = useState("");
  const [hpStat, setHpStat] = useState("C");
  const [hpCust, setHpCust] = useState("");
  const [hpPremU, setHpPremU] = useState("");
  const [hpStatU, setHpStatU] = useState("C");
  const [hpEndU, setHpEndU] = useState("");

  async function getPolicy(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(hpId);
    if (!id) return fb.showError("Enter a homeowners policy ID.");
    try {
      const { data } = await api.get(`/api/home_policies/${id}`);
      setHpRow(data as Record<string, unknown>);
      fb.ok("Homeowners policy loaded.");
    } catch (e) {
      fb.handleErr(e);
      setHpRow(null);
    }
  }

  async function createPolicy(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const cid = customerIdParamSchema.safeParse(hpCust);
    if (!cid.success) return fb.showError("Invalid customer ID.");
    try {
      await api.post("/api/home_policies", {
        home_policy_id: Number(hpPid),
        start_date: hpStart,
        end_date: hpEnd,
        premium_amount: Number(hpPrem),
        policy_status: hpStat,
        customer_id: cid.data,
      });
      fb.ok("Homeowners policy created.");
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function updatePolicy(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(hpId);
    if (!id) return fb.showError("Enter the homeowners policy ID in the field above first.");
    try {
      await api.put(`/api/home_policies/${id}`, {
        premium_amount: Number(hpPremU),
        policy_status: hpStatU,
        end_date: hpEndU,
      });
      fb.ok("Updated.");
      const { data } = await api.get(`/api/home_policies/${id}`);
      setHpRow(data as Record<string, unknown>);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function deletePolicy() {
    fb.clear();
    const id = numId(hpId);
    if (!id) return;
    try {
      await apiDelete(`/api/home_policies/${id}`);
      fb.ok("Deleted.");
      setHpRow(null);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  const [hiId, setHiId] = useState("");
  const [hiRow, setHiRow] = useState<Record<string, unknown> | null>(null);
  const [hiInvId, setHiInvId] = useState("");
  const [hiDate, setHiDate] = useState("");
  const [hiDue, setHiDue] = useState("");
  const [hiAmt, setHiAmt] = useState("");
  const [hiPol, setHiPol] = useState("");
  const [hiDueU, setHiDueU] = useState("");
  const [hiAmtU, setHiAmtU] = useState("");

  async function getInv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(hiId);
    if (!id) return fb.showError("Enter a homeowners invoice ID.");
    try {
      const { data } = await api.get(`/api/home_invoices/${id}`);
      setHiRow(data as Record<string, unknown>);
      fb.ok("Homeowners invoice loaded.");
    } catch (e) {
      fb.handleErr(e);
      setHiRow(null);
    }
  }

  async function createInv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    try {
      await api.post("/api/home_invoices", {
        home_invoice_id: Number(hiInvId),
        invoice_date: hiDate,
        due_date: hiDue,
        invoice_amount: Number(hiAmt),
        home_policy_id: Number(hiPol),
      });
      fb.ok("Homeowners invoice created.");
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function updateInv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(hiId);
    if (!id) return;
    try {
      await api.put(`/api/home_invoices/${id}`, {
        due_date: hiDueU,
        invoice_amount: Number(hiAmtU),
      });
      fb.ok("Updated.");
      const { data } = await api.get(`/api/home_invoices/${id}`);
      setHiRow(data as Record<string, unknown>);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function deleteInv() {
    fb.clear();
    const id = numId(hiId);
    if (!id) return;
    try {
      await apiDelete(`/api/home_invoices/${id}`);
      fb.ok("Deleted.");
      setHiRow(null);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  const [payId, setPayId] = useState("");
  const [payRow, setPayRow] = useState<Record<string, unknown> | null>(null);
  const [payNewId, setPayNewId] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState<(typeof PAY)[number]>("Credit");
  const [payAmt, setPayAmt] = useState("");
  const [payInv, setPayInv] = useState("");
  const [payMethodU, setPayMethodU] = useState<(typeof PAY)[number]>("Credit");
  const [payAmtU, setPayAmtU] = useState("");

  async function getPay(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(payId);
    if (!id) return fb.showError("Enter a homeowners payment ID.");
    try {
      const { data } = await api.get(`/api/home_payments/${id}`);
      setPayRow(data as Record<string, unknown>);
      fb.ok("Homeowners payment loaded.");
    } catch (e) {
      fb.handleErr(e);
      setPayRow(null);
    }
  }

  async function createPay(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    try {
      await api.post("/api/home_payments", {
        home_payment_id: Number(payNewId),
        payment_date: payDate,
        payment_method: payMethod,
        payment_amount: Number(payAmt),
        home_invoice_id: Number(payInv),
      });
      fb.ok("Homeowners payment created.");
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function updatePay(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(payId);
    if (!id) return;
    try {
      await api.put(`/api/home_payments/${id}`, {
        payment_method: payMethodU,
        payment_amount: Number(payAmtU),
      });
      fb.ok("Updated.");
      const { data } = await api.get(`/api/home_payments/${id}`);
      setPayRow(data as Record<string, unknown>);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function deletePay() {
    fb.clear();
    const id = numId(payId);
    if (!id) return;
    try {
      await apiDelete(`/api/home_payments/${id}`);
      fb.ok("Deleted.");
      setPayRow(null);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  return (
    <div className="workspace-section">
      <h3 className="section-title">Homeowners — policies, invoices & payments</h3>
      <StaffActionFeedback error={error} success={success} />

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Homeowners policy</h4>
        <form onSubmit={(e) => void getPolicy(e)} className="form-search-row">
          <input placeholder="Home policy ID" value={hpId} onChange={(e) => setHpId(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => void deletePolicy()}>
            Delete
          </button>
        </form>
        <ObjectTable data={hpRow} />
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>New policy</summary>
          <form onSubmit={(e) => void createPolicy(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>New policy ID</label>
                <input value={hpPid} onChange={(e) => setHpPid(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Effective date</label>
                <input type="date" value={hpStart} onChange={(e) => setHpStart(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Expiration date</label>
                <input type="date" value={hpEnd} onChange={(e) => setHpEnd(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Premium (USD)</label>
                <input value={hpPrem} onChange={(e) => setHpPrem(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select value={hpStat} onChange={(e) => setHpStat(e.target.value)}>
                  <option value="C">Current</option>
                  <option value="E">Expired</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Customer ID</label>
                <input value={hpCust} onChange={(e) => setHpCust(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Submit
            </button>
          </form>
        </details>
        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Update policy</summary>
          <form onSubmit={(e) => void updatePolicy(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Premium (USD)</label>
                <input value={hpPremU} onChange={(e) => setHpPremU(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select value={hpStatU} onChange={(e) => setHpStatU(e.target.value)}>
                  <option value="C">Current</option>
                  <option value="E">Expired</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Expiration date</label>
                <input type="date" value={hpEndU} onChange={(e) => setHpEndU(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </form>
        </details>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Homeowners invoice</h4>
        <form onSubmit={(e) => void getInv(e)} className="form-search-row">
          <input placeholder="Home invoice ID" value={hiId} onChange={(e) => setHiId(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => void deleteInv()}>
            Delete
          </button>
        </form>
        <ObjectTable data={hiRow} />
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>New invoice</summary>
          <form onSubmit={(e) => void createInv(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>New invoice ID</label>
                <input value={hiInvId} onChange={(e) => setHiInvId(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Invoice date</label>
                <input type="date" value={hiDate} onChange={(e) => setHiDate(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Due date</label>
                <input type="date" value={hiDue} onChange={(e) => setHiDue(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Amount (USD)</label>
                <input value={hiAmt} onChange={(e) => setHiAmt(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Home policy ID</label>
                <input value={hiPol} onChange={(e) => setHiPol(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Submit
            </button>
          </form>
        </details>
        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Update invoice</summary>
          <form onSubmit={(e) => void updateInv(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Due date</label>
                <input type="date" value={hiDueU} onChange={(e) => setHiDueU(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Amount (USD)</label>
                <input value={hiAmtU} onChange={(e) => setHiAmtU(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </form>
        </details>
      </div>

      <div className="card">
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Homeowners payment</h4>
        <form onSubmit={(e) => void getPay(e)} className="form-search-row">
          <input placeholder="Payment ID" value={payId} onChange={(e) => setPayId(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => void deletePay()}>
            Delete
          </button>
        </form>
        <ObjectTable data={payRow} />
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Record payment</summary>
          <form onSubmit={(e) => void createPay(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>New payment ID</label>
                <input value={payNewId} onChange={(e) => setPayNewId(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Payment date</label>
                <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as (typeof PAY)[number])}>
                  {PAY.map((p) => (
                    <option key={p} value={p}>
                      {PAY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Amount (USD)</label>
                <input value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Home invoice ID</label>
                <input value={payInv} onChange={(e) => setPayInv(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Submit
            </button>
          </form>
        </details>
        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Update payment</summary>
          <form onSubmit={(e) => void updatePay(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Method</label>
                <select value={payMethodU} onChange={(e) => setPayMethodU(e.target.value as (typeof PAY)[number])}>
                  {PAY.map((p) => (
                    <option key={p} value={p}>
                      {PAY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Amount (USD)</label>
                <input value={payAmtU} onChange={(e) => setPayAmtU(e.target.value)} />
              </div>
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
