-- Run this file only once. If it shows "Duplicate key name", it means indexes already exist.
USE HKR_DB;

CREATE INDEX idx_auto_policy_customer ON HKR_AUTO_POLICY(CUSTOMER_ID);
CREATE INDEX idx_home_policy_customer ON HKR_HOME_POLICY(CUSTOMER_ID);
CREATE INDEX idx_auto_invoice_policy ON HKR_AUTO_INVOICE(Auto_Policy_ID);
CREATE INDEX idx_home_invoice_policy ON HKR_HOME_INVOICE(Home_Policy_ID);
CREATE INDEX idx_auto_payment_invoice ON HKR_AUTO_PAYMENT(Auto_Invoice_ID);
CREATE INDEX idx_home_payment_invoice ON HKR_HOME_PAYMENT(Home_Invoice_ID);
CREATE INDEX idx_vehicle_policy ON HKR_INSURED_VEHICLE(Auto_Policy_ID);
CREATE INDEX idx_insured_home_policy ON HKR_INSURED_HOME(Home_Policy_ID);
