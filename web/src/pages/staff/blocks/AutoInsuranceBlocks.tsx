import { useState } from "react";
import { api } from "@/api/client";
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

export function AutoInsuranceBlocks() {
  const fb = useStaffFeedback();
  const { error, success } = fb;

  const [apId, setApId] = useState("");
  const [apRow, setApRow] = useState<Record<string, unknown> | null>(null);
  const [apPid, setApPid] = useState("");
  const [apStart, setApStart] = useState("");
  const [apEnd, setApEnd] = useState("");
  const [apPrem, setApPrem] = useState("");
  const [apStat, setApStat] = useState("C");
  const [apCust, setApCust] = useState("");
  const [apPremU, setApPremU] = useState("");
  const [apStatU, setApStatU] = useState("C");
  const [apEndU, setApEndU] = useState("");

  async function getPolicy(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(apId);
    if (!id) {
      fb.showError("Enter an auto policy ID.");
      return;
    }
    try {
      const { data } = await api.get(`/api/auto_policies/${id}`);
      setApRow(data as Record<string, unknown>);
      fb.ok("Auto policy loaded.");
    } catch (e) {
      fb.handleErr(e);
      setApRow(null);
    }
  }

  async function createPolicy(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const cid = customerIdParamSchema.safeParse(apCust);
    if (!cid.success) {
      fb.showError("Invalid customer ID.");
      return;
    }
    try {
      await api.post("/api/auto_policies", {
        auto_policy_id: Number(apPid),
        start_date: apStart,
        end_date: apEnd,
        premium_amount: Number(apPrem),
        policy_status: apStat,
        customer_id: cid.data,
      });
      fb.ok("Auto policy created.");
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function updatePolicy(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(apId);
    if (!id) return fb.showError("Enter the auto policy ID in the field above first.");
    try {
      await api.put(`/api/auto_policies/${id}`, {
        premium_amount: Number(apPremU),
        policy_status: apStatU,
        end_date: apEndU,
      });
      fb.ok("Updated.");
      const { data } = await api.get(`/api/auto_policies/${id}`);
      setApRow(data as Record<string, unknown>);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function deletePolicy() {
    fb.clear();
    const id = numId(apId);
    if (!id) return fb.showError("Enter an auto policy ID.");
    try {
      await apiDelete(`/api/auto_policies/${id}`);
      fb.ok("Deleted.");
      setApRow(null);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  const [aiId, setAiId] = useState("");
  const [aiRow, setAiRow] = useState<Record<string, unknown> | null>(null);
  const [aiInvId, setAiInvId] = useState("");
  const [aiDate, setAiDate] = useState("");
  const [aiDue, setAiDue] = useState("");
  const [aiAmt, setAiAmt] = useState("");
  const [aiPol, setAiPol] = useState("");
  const [aiDueU, setAiDueU] = useState("");
  const [aiAmtU, setAiAmtU] = useState("");

  async function getInv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(aiId);
    if (!id) return fb.showError("Enter an auto invoice ID.");
    try {
      const { data } = await api.get(`/api/auto_invoices/${id}`);
      setAiRow(data as Record<string, unknown>);
      fb.ok("Auto invoice loaded.");
    } catch (e) {
      fb.handleErr(e);
      setAiRow(null);
    }
  }

  async function createInv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    try {
      await api.post("/api/auto_invoices", {
        auto_invoice_id: Number(aiInvId),
        invoice_date: aiDate,
        due_date: aiDue,
        invoice_amount: Number(aiAmt),
        auto_policy_id: Number(aiPol),
      });
      fb.ok("Auto invoice created.");
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function updateInv(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    const id = numId(aiId);
    if (!id) return fb.showError("Enter the auto invoice ID in the field above first.");
    try {
      await api.put(`/api/auto_invoices/${id}`, {
        due_date: aiDueU,
        invoice_amount: Number(aiAmtU),
      });
      fb.ok("Updated.");
      const { data } = await api.get(`/api/auto_invoices/${id}`);
      setAiRow(data as Record<string, unknown>);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  async function deleteInv() {
    fb.clear();
    const id = numId(aiId);
    if (!id) return;
    try {
      await apiDelete(`/api/auto_invoices/${id}`);
      fb.ok("Deleted.");
      setAiRow(null);
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
    if (!id) return fb.showError("Enter an auto payment ID.");
    try {
      const { data } = await api.get(`/api/auto_payments/${id}`);
      setPayRow(data as Record<string, unknown>);
      fb.ok("Auto payment loaded.");
    } catch (e) {
      fb.handleErr(e);
      setPayRow(null);
    }
  }

  async function createPay(e: React.FormEvent) {
    e.preventDefault();
    fb.clear();
    try {
      await api.post("/api/auto_payments", {
        auto_payment_id: Number(payNewId),
        payment_date: payDate,
        payment_method: payMethod,
        payment_amount: Number(payAmt),
        auto_invoice_id: Number(payInv),
      });
      fb.ok("Auto payment created.");
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
      await api.put(`/api/auto_payments/${id}`, {
        payment_method: payMethodU,
        payment_amount: Number(payAmtU),
      });
      fb.ok("Updated.");
      const { data } = await api.get(`/api/auto_payments/${id}`);
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
      await apiDelete(`/api/auto_payments/${id}`);
      fb.ok("Deleted.");
      setPayRow(null);
    } catch (e) {
      fb.handleErr(e);
    }
  }

  return (
    <div className="workspace-section">
      <h3 className="section-title">Auto — policies, invoices & payments</h3>
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Auto policy</h4>
        <form onSubmit={(e) => void getPolicy(e)} className="form-search-row">
          <input placeholder="Auto policy ID" value={apId} onChange={(e) => setApId(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => void deletePolicy()}>
            Delete
          </button>
        </form>
        <ObjectTable data={apRow} />
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>New policy</summary>
          <form onSubmit={(e) => void createPolicy(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>New policy ID</label>
                <input value={apPid} onChange={(e) => setApPid(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Effective date</label>
                <input type="date" value={apStart} onChange={(e) => setApStart(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Expiration date</label>
                <input type="date" value={apEnd} onChange={(e) => setApEnd(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Premium (USD)</label>
                <input value={apPrem} onChange={(e) => setApPrem(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select value={apStat} onChange={(e) => setApStat(e.target.value)}>
                  <option value="C">Current (C)</option>
                  <option value="E">Expired (E)</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Customer ID</label>
                <input value={apCust} onChange={(e) => setApCust(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Submit
            </button>
          </form>
        </details>
        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Update policy (uses ID in search field)</summary>
          <form onSubmit={(e) => void updatePolicy(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Premium (USD)</label>
                <input value={apPremU} onChange={(e) => setApPremU(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select value={apStatU} onChange={(e) => setApStatU(e.target.value)}>
                  <option value="C">Current (C)</option>
                  <option value="E">Expired (E)</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Expiration date</label>
                <input type="date" value={apEndU} onChange={(e) => setApEndU(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </form>
        </details>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Auto invoice</h4>
        <form onSubmit={(e) => void getInv(e)} className="form-search-row">
          <input placeholder="Auto invoice ID" value={aiId} onChange={(e) => setAiId(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => void deleteInv()}>
            Delete
          </button>
        </form>
        <ObjectTable data={aiRow} />
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>New invoice</summary>
          <form onSubmit={(e) => void createInv(e)} style={{ marginTop: "0.5rem" }}>
            <div className="field-grid">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>New invoice ID</label>
                <input value={aiInvId} onChange={(e) => setAiInvId(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Invoice date</label>
                <input type="date" value={aiDate} onChange={(e) => setAiDate(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Due date</label>
                <input type="date" value={aiDue} onChange={(e) => setAiDue(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Amount (USD)</label>
                <input value={aiAmt} onChange={(e) => setAiAmt(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Auto policy ID</label>
                <input value={aiPol} onChange={(e) => setAiPol(e.target.value)} />
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
                <input type="date" value={aiDueU} onChange={(e) => setAiDueU(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Amount (USD)</label>
                <input value={aiAmtU} onChange={(e) => setAiAmtU(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </form>
        </details>
      </div>

      <div className="card">
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Auto payment</h4>
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
                <label>Auto invoice ID</label>
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
