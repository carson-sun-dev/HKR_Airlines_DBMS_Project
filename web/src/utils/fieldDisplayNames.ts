/**
 * Maps API / database column keys to readable English labels (U.S. insurance portal style).
 * Unknown keys fall back to {@link humanizeColumnLabel}.
 */
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  CUSTOMER_ID: "Customer ID",
  Customer_ID: "Customer ID",
  customer_id: "Customer ID",
  First_Name: "First Name",
  first_name: "First Name",
  Last_Name: "Last Name",
  last_name: "Last Name",
  Street_Address: "Street Address",
  street_address: "Street Address",
  City: "City",
  city: "City",
  State: "State",
  state: "State",
  Zip_Code: "ZIP Code",
  zip_code: "ZIP Code",
  Gender: "Gender",
  gender: "Gender",
  Marital_Status: "Marital Status",
  marital_status: "Marital Status",
  Customer_Type: "Customer Type",
  customer_type: "Customer Type",
  Auto_Policy_ID: "Auto Policy ID",
  auto_policy_id: "Auto Policy ID",
  Home_Policy_ID: "Home Policy ID",
  home_policy_id: "Home Policy ID",
  Start_Date: "Effective Date",
  start_date: "Effective Date",
  End_Date: "Expiration Date",
  end_date: "Expiration Date",
  Premium_Amount: "Premium Amount",
  premium_amount: "Premium Amount",
  Policy_Status: "Policy Status",
  policy_status: "Policy Status",
  Auto_Invoice_ID: "Auto Invoice ID",
  auto_invoice_id: "Auto Invoice ID",
  Home_Invoice_ID: "Home Invoice ID",
  home_invoice_id: "Home Invoice ID",
  Invoice_Date: "Invoice Date",
  invoice_date: "Invoice Date",
  Due_Date: "Due Date",
  due_date: "Due Date",
  Invoice_Amount: "Invoice Amount",
  invoice_amount: "Invoice Amount",
  Auto_Payment_ID: "Auto Payment ID",
  auto_payment_id: "Auto Payment ID",
  Home_Payment_ID: "Home Payment ID",
  home_payment_id: "Home Payment ID",
  Payment_Date: "Payment Date",
  payment_date: "Payment Date",
  Payment_Method: "Payment Method",
  payment_method: "Payment Method",
  Payment_Amount: "Payment Amount",
  payment_amount: "Payment Amount",
  Home_ID: "Home ID",
  home_id: "Home ID",
  Purchase_Date: "Purchase Date",
  purchase_date: "Purchase Date",
  Purchase_Value: "Purchase Value",
  purchase_value: "Purchase Value",
  Area_Sq_Ft: "Area (Sq Ft)",
  area_sq_ft: "Area (Sq Ft)",
  Home_Type: "Home Type",
  home_type: "Home Type",
  Auto_Fire_Notification: "Fire Notification",
  auto_fire_notification: "Fire Notification",
  Home_Security_System: "Security System",
  home_security_system: "Security System",
  Swimming_Pool: "Swimming Pool",
  swimming_pool: "Swimming Pool",
  Basement: "Basement",
  basement: "Basement",
  Vehicle_ID: "Vehicle ID",
  vehicle_id: "Vehicle ID",
  VIN: "VIN",
  vin: "VIN",
  Make_Model_Year: "Make / Model / Year",
  make_model_year: "Make / Model / Year",
  Vehicle_Status: "Vehicle Status",
  vehicle_status: "Vehicle Status",
  Driver_ID: "Driver ID",
  driver_id: "Driver ID",
  License_Number: "License Number",
  license_number: "License Number",
  Age: "Age",
  age: "Age",
};

const ACRONYMS = new Set(["ID", "VIN", "SSN"]);

function titleWord(part: string): string {
  const u = part.toUpperCase();
  if (ACRONYMS.has(u)) return u;
  if (/^[A-Z]{2,}$/.test(part) && part.length <= 5) {
    return part.charAt(0) + part.slice(1).toLowerCase();
  }
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

/** Converts Underscore_Names and snake_case into Title Case labels without underscores. */
export function humanizeColumnLabel(key: string): string {
  const direct = FIELD_LABEL_OVERRIDES[key];
  if (direct) return direct;
  const parts = key.split(/_+/).filter(Boolean);
  if (parts.length === 0) return key;
  return parts.map(titleWord).join(" ");
}
