import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "@/api/client";
import { formatTableCell } from "@/utils/dbEnumLabels";
import { humanizeColumnLabel } from "@/utils/fieldDisplayNames";

const DATASETS = {
  "auto-policies": {
    title: "All auto policies",
    description: "Every auto policy in the portfolio (premium figures sum to company auto premium).",
    apiPath: "/api/reports/auto_policies",
    idColumn: "Auto_Policy_ID",
    searchLabel: "Auto policy ID",
  },
  "home-policies": {
    title: "All home policies",
    description: "Every homeowners policy in the portfolio (premium figures sum to company home premium).",
    apiPath: "/api/reports/home_policies",
    idColumn: "Home_Policy_ID",
    searchLabel: "Home policy ID",
  },
  customers: {
    title: "All customers",
    description: "Registered customer accounts.",
    apiPath: "/api/reports/customers",
    idColumn: "CUSTOMER_ID",
    searchLabel: "Customer ID",
  },
} as const;

type DatasetKey = keyof typeof DATASETS;

function rowMatchesId(row: Record<string, unknown>, idColumn: string, query: string): boolean {
  const t = query.trim();
  if (!t) return true;
  const raw = row[idColumn];
  if (raw === undefined || raw === null) return false;
  if (String(raw) === t) return true;
  const nq = Number(t);
  const nr = Number(raw);
  if (Number.isFinite(nq) && Number.isFinite(nr) && nq === nr) return true;
  return false;
}

function RecordsTable({
  rows,
  rowIdColumn,
}: {
  rows: Record<string, unknown>[];
  /** Stable React key when filtering (primary key column name). */
  rowIdColumn?: string;
}) {
  if (rows.length === 0) {
    return <p className="card-muted">No records found.</p>;
  }
  const keys = Object.keys(rows[0]);
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{humanizeColumnLabel(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowIdColumn ? String(row[rowIdColumn] ?? i) : i}>
              {keys.map((k) => (
                <td key={k}>{formatTableCell(k, row[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Employee-only full listings linked from the Home dashboard stats. */
export function EmployeeReportDatasetPage() {
  const { dataset } = useParams<{ dataset: string }>();
  const key = dataset as DatasetKey | undefined;
  const cfg = key && key in DATASETS ? DATASETS[key] : null;

  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [idSearch, setIdSearch] = useState("");

  useEffect(() => {
    setIdSearch("");
  }, [dataset]);

  useEffect(() => {
    if (!cfg) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await api.get<Record<string, unknown>[]>(cfg.apiPath);
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : []);
        }
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        if (!cancelled) {
          setErr(String(msg ?? "Unable to load data."));
          setRows(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cfg]);

  if (!cfg) {
    return <Navigate to="/" replace />;
  }

  const filteredRows =
    rows?.filter((row) => rowMatchesId(row, cfg.idColumn, idSearch)) ?? null;
  const totalLoaded = rows?.length ?? 0;
  const shownCount = filteredRows?.length ?? 0;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/" className="btn btn-sm">
          ← Back to Home
        </Link>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem", color: "var(--text)" }}>{cfg.title}</h1>
        <p className="card-muted" style={{ margin: 0 }}>
          {cfg.description}
        </p>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <form
          className="form-inline-end"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="field" style={{ marginBottom: 0, flex: "1 1 240px", maxWidth: 360 }}>
            <label htmlFor="report-id-search">Search by ID ({cfg.searchLabel})</label>
            <input
              id="report-id-search"
              inputMode="numeric"
              value={idSearch}
              onChange={(e) => setIdSearch(e.target.value)}
              placeholder={`Enter ${cfg.searchLabel}`}
            />
          </div>
        </form>
        <p className="card-muted" style={{ margin: "0.75rem 0 0", fontSize: "0.88rem" }}>
          Leave blank to show the full list. Matches the{" "}
          <strong>{humanizeColumnLabel(cfg.idColumn)}</strong> column.
        </p>
      </div>

      <div className="card">
        {loading ? <p className="card-muted">Loading…</p> : null}
        {err ? <div className="error-banner">{err}</div> : null}
        {!loading && !err && rows && filteredRows ? (
          <>
            <p className="card-muted" style={{ marginTop: 0 }}>
              {idSearch.trim()
                ? `Showing ${shownCount} of ${totalLoaded} loaded row${totalLoaded === 1 ? "" : "s"}`
                : `${totalLoaded} row${totalLoaded === 1 ? "" : "s"}`}
            </p>
            <RecordsTable rows={filteredRows} rowIdColumn={cfg.idColumn} />
          </>
        ) : null}
      </div>
    </div>
  );
}
