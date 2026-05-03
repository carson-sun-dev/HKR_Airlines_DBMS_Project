import { humanizeColumnLabel } from "@/utils/fieldDisplayNames";

/** Renders a JSON object as a single-row table with readable column titles. */
export function ObjectTable({ data }: { data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) return null;
  const keys = Object.keys(data);
  return (
    <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
      <table className="data-table">
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{humanizeColumnLabel(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {keys.map((k) => (
              <td key={k}>{formatCell(data[k])}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
