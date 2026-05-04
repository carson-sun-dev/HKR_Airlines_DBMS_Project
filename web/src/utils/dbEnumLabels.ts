/** Maps single-letter DB codes to UI labels. API fields may be PascalCase or snake_case. */

export const VEHICLE_STATUS_LABEL: Record<string, string> = {
  L: "Leased",
  F: "Financed",
  O: "Owned",
};

export const HOME_TYPE_LABEL: Record<string, string> = {
  S: "Single Family",
  M: "Multi Family",
  C: "Condominium",
  T: "Townhouse",
};

export const POLICY_STATUS_LABEL: Record<string, string> = {
  C: "Current",
  E: "Expired",
};

/** HKR_CUSTOMER.Gender: M / F (schema). */
export const GENDER_LABEL: Record<string, string> = {
  M: "Male",
  F: "Female",
};

export const MARITAL_STATUS_LABEL: Record<string, string> = {
  M: "Married",
  S: "Single",
  W: "Widow",
};

export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  A: "Auto",
  H: "Home",
  B: "Both",
};

/** Formats a table cell: known enum columns show words; other values pass through. */
export function formatTableCell(columnKey: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  const s = String(value);
  switch (columnKey) {
    case "Vehicle_Status":
    case "vehicle_status":
      return VEHICLE_STATUS_LABEL[s] ?? s;
    case "Home_Type":
    case "home_type":
      return HOME_TYPE_LABEL[s] ?? s;
    case "Policy_Status":
    case "policy_status":
      return POLICY_STATUS_LABEL[s] ?? s;
    case "Gender":
    case "gender":
      return GENDER_LABEL[s] ?? s;
    case "Marital_Status":
    case "marital_status":
      return MARITAL_STATUS_LABEL[s] ?? s;
    case "Customer_Type":
    case "customer_type":
      return CUSTOMER_TYPE_LABEL[s] ?? s;
    default:
      return s;
  }
}
