import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { ObjectTable } from "@/components/ObjectTable";
import { myRecordsPageSchema, overviewStatsSchema } from "@/schemas/forms";
import { humanizeColumnLabel } from "@/utils/fieldDisplayNames";

const COLORS = ["#0ea5e9", "#22c55e", "#8b5cf6", "#f59e0b"];
const CHART_TIP = {
  background: "#ffffff",
  border: "1px solid rgba(14, 165, 233, 0.35)",
  borderRadius: 12,
  color: "#0c4a6e",
};

function looksLikeErrorMessage(msg: string): boolean {
  return /fail|error|forbidden|denied|invalid|unauthorized|not found/i.test(msg);
}

function formatCell(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

const RECORD_PAGE_SIZE = 10;

const RECORD_DETAIL_PATHS: Record<string, string> = {
  auto_policy: "/api/auto_policies",
  home_policy: "/api/home_policies",
  auto_invoice: "/api/auto_invoices",
  home_invoice: "/api/home_invoices",
  auto_payment: "/api/auto_payments",
  home_payment: "/api/home_payments",
  insured_home: "/api/insured_homes",
  insured_vehicle: "/api/insured_vehicles",
  driver: "/api/drivers",
};

const MY_RECORD_ID_KEY: Record<string, string> = {
  auto_policy: "Auto_Policy_ID",
  home_policy: "Home_Policy_ID",
  auto_invoice: "Auto_Invoice_ID",
  home_invoice: "Home_Invoice_ID",
  auto_payment: "Auto_Payment_ID",
  home_payment: "Home_Payment_ID",
  insured_home: "Home_ID",
  insured_vehicle: "Vehicle_ID",
  driver: "Driver_ID",
};

const MY_RECORD_SUMMARY_COLS: Record<string, string[]> = {
  auto_policy: ["Auto_Policy_ID", "Start_Date", "End_Date", "Premium_Amount", "Policy_Status"],
  home_policy: ["Home_Policy_ID", "Start_Date", "End_Date", "Premium_Amount", "Policy_Status"],
  auto_invoice: ["Auto_Invoice_ID", "Invoice_Date", "Due_Date", "Invoice_Amount", "Auto_Policy_ID"],
  home_invoice: ["Home_Invoice_ID", "Invoice_Date", "Due_Date", "Invoice_Amount", "Home_Policy_ID"],
  auto_payment: ["Auto_Payment_ID", "Payment_Date", "Payment_Method", "Payment_Amount", "Auto_Invoice_ID"],
  home_payment: ["Home_Payment_ID", "Payment_Date", "Payment_Method", "Payment_Amount", "Home_Invoice_ID"],
  insured_home: ["Home_ID", "Home_Policy_ID", "Purchase_Date", "Area_Sq_Ft", "Home_Type"],
  insured_vehicle: ["Vehicle_ID", "Auto_Policy_ID", "VIN", "Make_Model_Year", "Vehicle_Status"],
  driver: ["Driver_ID", "License_Number", "First_Name", "Last_Name", "Age"],
};

export function DashboardPage() {
  const { role, customerId } = useAuth();
  const [stats, setStats] = useState<{
    auto_policy_count: number;
    auto_premium_total: number;
    home_policy_count: number;
    home_premium_total: number;
    customer_count: number;
  } | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrZip, setAddrZip] = useState("");
  const [addrOk, setAddrOk] = useState<string | null>(null);

  const [qKind, setQKind] = useState("auto_policy");
  const [qId, setQId] = useState("");
  const [qRow, setQRow] = useState<Record<string, unknown> | null>(null);
  const [qErr, setQErr] = useState<string | null>(null);

  const [recordPage, setRecordPage] = useState(1);
  const [myListItems, setMyListItems] = useState<Record<string, unknown>[]>([]);
  const [myListTotal, setMyListTotal] = useState(0);
  const [myListLoading, setMyListLoading] = useState(false);
  const [myListErr, setMyListErr] = useState<string | null>(null);

  const [apPayId, setApPayId] = useState("");
  const [apPayDate, setApPayDate] = useState("");
  const [apPayMethod, setApPayMethod] = useState("Credit");
  const [apPayAmt, setApPayAmt] = useState("");
  const [apPayInv, setApPayInv] = useState("");
  const [apPayMsg, setApPayMsg] = useState<string | null>(null);

  const [hpPayId, setHpPayId] = useState("");
  const [hpPayDate, setHpPayDate] = useState("");
  const [hpPayMethod, setHpPayMethod] = useState("Credit");
  const [hpPayAmt, setHpPayAmt] = useState("");
  const [hpPayInv, setHpPayInv] = useState("");
  const [hpPayMsg, setHpPayMsg] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "E") return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/stats/overview");
        const parsed = overviewStatsSchema.safeParse(data);
        if (!parsed.success) {
          if (!cancelled) setStatsError("Summary data is unavailable. Please try again later.");
          return;
        }
        if (!cancelled) {
          setStats(parsed.data);
          setStatsError(null);
        }
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        if (!cancelled) setStatsError(String(msg ?? "Unable to load company overview. Sign in with an employee account."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (role !== "C" || customerId == null) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/customers/${customerId}`);
        if (!cancelled) {
          const row = data as Record<string, unknown>;
          setProfile(row);
          setProfileErr(null);
          setAddrStreet(String(row.Street_Address ?? ""));
          setAddrCity(String(row.City ?? ""));
          setAddrState(String(row.State ?? ""));
          setAddrZip(String(row.Zip_Code ?? ""));
        }
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        if (!cancelled) setProfileErr(String(msg ?? "We could not load your profile. Please try again."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, customerId]);

  useEffect(() => {
    if (role !== "C" || customerId == null) {
      setMyListItems([]);
      setMyListTotal(0);
      setMyListErr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setMyListLoading(true);
      setMyListErr(null);
      try {
        const { data } = await api.get(`/api/me/records/${qKind}`, {
          params: { page: recordPage, per_page: RECORD_PAGE_SIZE },
        });
        const parsed = myRecordsPageSchema.safeParse(data);
        if (!parsed.success) {
          if (!cancelled) setMyListErr("Could not load your record list.");
          return;
        }
        if (!cancelled) {
          setMyListItems(parsed.data.items);
          setMyListTotal(parsed.data.total);
        }
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        if (!cancelled) setMyListErr(String(msg ?? "Unable to load records."));
      } finally {
        if (!cancelled) setMyListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, customerId, qKind, recordPage]);

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setAddrOk(null);
    if (customerId == null) return;
    try {
      await api.put(`/api/customers/${customerId}`, {
        street_address: addrStreet,
        city: addrCity,
        state: addrState,
        zip_code: addrZip,
      });
      setAddrOk("Your mailing address was saved.");
      const { data } = await api.get(`/api/customers/${customerId}`);
      setProfile(data as Record<string, unknown>);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setProfileErr(String(msg ?? "Unable to save changes."));
    }
  }

  async function submitAutoPayment(e: React.FormEvent) {
    e.preventDefault();
    setApPayMsg(null);
    try {
      await api.post("/api/auto_payments", {
        auto_payment_id: Number(apPayId),
        payment_date: apPayDate,
        payment_method: apPayMethod,
        payment_amount: Number(apPayAmt),
        auto_invoice_id: Number(apPayInv),
      });
      setApPayMsg("Auto payment recorded.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApPayMsg(String(msg ?? "Submission failed."));
    }
  }

  async function submitHomePayment(e: React.FormEvent) {
    e.preventDefault();
    setHpPayMsg(null);
    try {
      await api.post("/api/home_payments", {
        home_payment_id: Number(hpPayId),
        payment_date: hpPayDate,
        payment_method: hpPayMethod,
        payment_amount: Number(hpPayAmt),
        home_invoice_id: Number(hpPayInv),
      });
      setHpPayMsg("Homeowners payment recorded.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setHpPayMsg(String(msg ?? "Submission failed."));
    }
  }

  async function runCustomerLookup(e: React.FormEvent) {
    e.preventDefault();
    setQErr(null);
    setQRow(null);
    const id = Number(qId.trim());
    if (!Number.isInteger(id) || id <= 0) {
      setQErr("Enter a valid positive integer record ID.");
      return;
    }
    const base = RECORD_DETAIL_PATHS[qKind];
    if (!base) {
      setQErr("Select a record type.");
      return;
    }
    try {
      const { data } = await api.get(`${base}/${id}`);
      setQRow(data as Record<string, unknown>);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setQErr(String(msg ?? "Record not found or not available for your account."));
    }
  }

  const barData =
    stats == null
      ? []
      : [
          { name: "Auto policies", value: stats.auto_policy_count },
          { name: "Home policies", value: stats.home_policy_count },
          { name: "Customers", value: stats.customer_count },
        ];

  const pieData =
    stats == null
      ? []
      : [
          { name: "Auto premium", value: stats.auto_premium_total },
          { name: "Home premium", value: stats.home_premium_total },
        ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 1100 }}>
      <div className="card">
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>Home</h2>
        <p className="card-muted" style={{ margin: 0 }}>
          {role === "E" ? (
            <>
              Company-wide policy and customer metrics appear below. To add or edit policies, customers, or billing, go to{" "}
              <Link to="/manage">Policy administration</Link>.
            </>
          ) : (
            <>
              This is your policyholder profile. You may update your mailing address below. For other changes, contact your
              dedicated HKR account administrator.
            </>
          )}
        </p>
      </div>

      {role === "C" ? (
        <>
          {profileErr ? <div className="error-banner">{profileErr}</div> : null}
          <div className="card">
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>My profile</h3>
            <ObjectTable data={profile} />
            <form onSubmit={(e) => void saveAddress(e)} style={{ marginTop: "1rem" }}>
              <p className="card-muted" style={{ marginBottom: "0.75rem" }}>
                Mailing address (street, city, state, ZIP). Changes take effect when you save.
              </p>
              <div className="field-grid">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Street address</label>
                  <input value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>City</label>
                  <input value={addrCity} onChange={(e) => setAddrCity(e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>State (2 letters)</label>
                  <input value={addrState} onChange={(e) => setAddrState(e.target.value)} maxLength={2} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>ZIP code</label>
                  <input value={addrZip} onChange={(e) => setAddrZip(e.target.value)} />
                </div>
              </div>
              {addrOk ? <div className="success-banner">{addrOk}</div> : null}
              <button type="submit" className="btn btn-primary btn-sm">
                Save address
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Your records</h3>
            <p className="card-muted" style={{ marginBottom: "0.75rem" }}>
              Choose a record type for the browse list. To see full details for one record, use <strong>Look up by ID</strong> with
              the ID from your documents. You can only view information linked to your account.
            </p>
            <div className="field" style={{ marginBottom: "1rem", maxWidth: 360 }}>
              <label>Record type</label>
              <select
                value={qKind}
                onChange={(e) => {
                  setQKind(e.target.value);
                  setRecordPage(1);
                  setQRow(null);
                  setQErr(null);
                }}
              >
                <option value="auto_policy">Auto policy</option>
                <option value="home_policy">Homeowners policy</option>
                <option value="auto_invoice">Auto invoice</option>
                <option value="home_invoice">Homeowners invoice</option>
                <option value="auto_payment">Auto payment</option>
                <option value="home_payment">Homeowners payment</option>
                <option value="insured_home">Insured home</option>
                <option value="insured_vehicle">Insured vehicle</option>
                <option value="driver">Driver</option>
              </select>
            </div>

            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Browse (paginated)</h4>
            {myListErr ? <div className="error-banner" style={{ marginBottom: "0.75rem" }}>{myListErr}</div> : null}
            {myListLoading ? (
              <p className="card-muted" style={{ margin: "0 0 0.75rem" }}>
                Loading…
              </p>
            ) : myListItems.length === 0 ? (
              <p className="card-muted" style={{ margin: "0 0 0.75rem" }}>
                No records of this type on file for your account.
              </p>
            ) : (
              <div style={{ overflowX: "auto", marginBottom: "0.75rem" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {(MY_RECORD_SUMMARY_COLS[qKind] ?? []).map((col) => (
                        <th key={col}>{humanizeColumnLabel(col)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myListItems.map((row, idx) => (
                      <tr key={`${MY_RECORD_ID_KEY[qKind]}-${String(row[MY_RECORD_ID_KEY[qKind]] ?? idx)}`}>
                        {(MY_RECORD_SUMMARY_COLS[qKind] ?? []).map((col) => (
                          <td key={col}>{formatCell(row[col])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: "1.25rem",
              }}
            >
              <button
                type="button"
                className="btn btn-sm"
                disabled={recordPage <= 1 || myListLoading}
                onClick={() => setRecordPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="card-muted">
                Page {recordPage} of {Math.max(1, Math.ceil(myListTotal / RECORD_PAGE_SIZE))} ({myListTotal} total)
              </span>
              <button
                type="button"
                className="btn btn-sm"
                disabled={recordPage * RECORD_PAGE_SIZE >= myListTotal || myListLoading}
                onClick={() => setRecordPage((p) => p + 1)}
              >
                Next
              </button>
            </div>

            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Look up by ID</h4>
            <form onSubmit={(e) => void runCustomerLookup(e)} className="form-inline-end">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Record ID</label>
                <input value={qId} onChange={(e) => setQId(e.target.value)} placeholder="ID from your document" />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Search
              </button>
            </form>
            {qErr ? <div className="error-banner" style={{ marginTop: "0.75rem" }}>{qErr}</div> : null}
            <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.95rem" }}>Record detail</h4>
            {qRow ? (
              <ObjectTable data={qRow} />
            ) : (
              <p className="card-muted" style={{ margin: 0 }}>
                Run <strong>Look up by ID</strong> above to load full record details here.
              </p>
            )}
          </div>

          <div className="card">
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Report a payment</h3>
            <p className="card-muted" style={{ marginBottom: "1rem" }}>
              Apply a payment to an invoice. Accepted methods match our billing system: PayPal, credit card, debit card, or
              check.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
              <div>
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Auto — report payment</h4>
                <form onSubmit={(e) => void submitAutoPayment(e)}>
                  <div className="field-grid">
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>New payment ID</label>
                      <input value={apPayId} onChange={(e) => setApPayId(e.target.value)} placeholder="Must be unique" />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Payment date</label>
                      <input type="date" value={apPayDate} onChange={(e) => setApPayDate(e.target.value)} />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Method</label>
                      <select value={apPayMethod} onChange={(e) => setApPayMethod(e.target.value)}>
                        {[
                          { v: "PayPal", l: "PayPal" },
                          { v: "Credit", l: "Credit card" },
                          { v: "Debit", l: "Debit card" },
                          { v: "Check", l: "Check" },
                        ].map((p) => (
                          <option key={p.v} value={p.v}>
                            {p.l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Amount (USD)</label>
                      <input value={apPayAmt} onChange={(e) => setApPayAmt(e.target.value)} />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Auto invoice ID</label>
                      <input value={apPayInv} onChange={(e) => setApPayInv(e.target.value)} />
                    </div>
                  </div>
                  {apPayMsg ? (
                    <div
                      className={looksLikeErrorMessage(apPayMsg) ? "error-banner" : "success-banner"}
                      style={{ marginTop: "0.5rem" }}
                    >
                      {apPayMsg}
                    </div>
                  ) : null}
                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }}>
                    Submit auto payment
                  </button>
                </form>
              </div>
              <div>
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Homeowners — report payment</h4>
                <form onSubmit={(e) => void submitHomePayment(e)}>
                  <div className="field-grid">
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>New payment ID</label>
                      <input value={hpPayId} onChange={(e) => setHpPayId(e.target.value)} placeholder="Must be unique" />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Payment date</label>
                      <input type="date" value={hpPayDate} onChange={(e) => setHpPayDate(e.target.value)} />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Method</label>
                      <select value={hpPayMethod} onChange={(e) => setHpPayMethod(e.target.value)}>
                        {[
                          { v: "PayPal", l: "PayPal" },
                          { v: "Credit", l: "Credit card" },
                          { v: "Debit", l: "Debit card" },
                          { v: "Check", l: "Check" },
                        ].map((p) => (
                          <option key={p.v} value={p.v}>
                            {p.l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Amount (USD)</label>
                      <input value={hpPayAmt} onChange={(e) => setHpPayAmt(e.target.value)} />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Homeowners invoice ID</label>
                      <input value={hpPayInv} onChange={(e) => setHpPayInv(e.target.value)} />
                    </div>
                  </div>
                  {hpPayMsg ? (
                    <div
                      className={looksLikeErrorMessage(hpPayMsg) ? "error-banner" : "success-banner"}
                      style={{ marginTop: "0.5rem" }}
                    >
                      {hpPayMsg}
                    </div>
                  ) : null}
                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }}>
                    Submit homeowners payment
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {role === "E" ? (
        <>
          {statsError ? <div className="error-banner">{statsError}</div> : null}
          {stats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              {[
                { label: "Auto policies (count)", value: stats.auto_policy_count },
                { label: "Home policies (count)", value: stats.home_policy_count },
                { label: "Customers (registered)", value: stats.customer_count },
                {
                  label: "Auto premium (total)",
                  value: `$${stats.auto_premium_total.toLocaleString("en-US")}`,
                },
                {
                  label: "Home premium (total)",
                  value: `$${stats.home_premium_total.toLocaleString("en-US")}`,
                },
              ].map((c) => (
                <div key={c.label} className="card">
                  <div className="card-muted">{c.label}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.35rem", color: "var(--primary-dark)" }}>
                    {c.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {stats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "1rem",
              }}
            >
              <div className="card" style={{ minHeight: 320 }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Portfolio volume</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 165, 233, 0.25)" />
                    <XAxis dataKey="name" tick={{ fill: "#0369a1", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#0369a1", fontSize: 12 }} />
                    <Tooltip contentStyle={CHART_TIP} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card" style={{ minHeight: 320 }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Premium mix</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={CHART_TIP} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
