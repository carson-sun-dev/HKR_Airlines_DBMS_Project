USE HKR_DB;

-- Test Query 1: Check record count for all tables
SELECT 'HKR_CUSTOMER' AS Table_Name, COUNT(*) AS Record_Count FROM HKR_CUSTOMER
UNION ALL SELECT 'HKR_DRIVER', COUNT(*) FROM HKR_DRIVER
UNION ALL SELECT 'HKR_AUTO_POLICY', COUNT(*) FROM HKR_AUTO_POLICY
UNION ALL SELECT 'HKR_HOME_POLICY', COUNT(*) FROM HKR_HOME_POLICY
UNION ALL SELECT 'HKR_AUTO_INVOICE', COUNT(*) FROM HKR_AUTO_INVOICE
UNION ALL SELECT 'HKR_HOME_INVOICE', COUNT(*) FROM HKR_HOME_INVOICE
UNION ALL SELECT 'HKR_AUTO_PAYMENT', COUNT(*) FROM HKR_AUTO_PAYMENT
UNION ALL SELECT 'HKR_HOME_PAYMENT', COUNT(*) FROM HKR_HOME_PAYMENT
UNION ALL SELECT 'HKR_INSURED_VEHICLE', COUNT(*) FROM HKR_INSURED_VEHICLE
UNION ALL SELECT 'HKR_INSURED_HOME', COUNT(*) FROM HKR_INSURED_HOME
UNION ALL SELECT 'HKR_DRIVER_VEHICLE', COUNT(*) FROM HKR_DRIVER_VEHICLE;


-- Test Query 2: View user accounts and roles
SELECT * FROM HKR_USER;


-- Test Query 3: Customer 1 auto insurance policies
SELECT 
    c.Customer_ID,
    CONCAT(c.First_Name, ' ', c.Last_Name) AS Customer_Name,
    ap.Auto_Policy_ID,
    ap.Start_Date,
    ap.End_Date,
    ap.Premium_Amount,
    ap.Policy_Status
FROM HKR_CUSTOMER c
JOIN HKR_AUTO_POLICY ap
    ON c.Customer_ID = ap.CUSTOMER_ID
WHERE c.Customer_ID = 1;


-- Test Query 4: Customer 1 auto invoice and payment balance
SELECT 
    c.Customer_ID,
    CONCAT(c.First_Name, ' ', c.Last_Name) AS Customer_Name,
    ap.Auto_Policy_ID,
    ai.Auto_Invoice_ID,
    ai.Invoice_Date,
    ai.Due_Date,
    ai.Invoice_Amount,
    COALESCE(SUM(p.Payment_Amount), 0) AS Total_Paid,
    ai.Invoice_Amount - COALESCE(SUM(p.Payment_Amount), 0) AS Balance_Due
FROM HKR_CUSTOMER c
JOIN HKR_AUTO_POLICY ap
    ON c.Customer_ID = ap.CUSTOMER_ID
JOIN HKR_AUTO_INVOICE ai
    ON ap.Auto_Policy_ID = ai.Auto_Policy_ID
LEFT JOIN HKR_AUTO_PAYMENT p
    ON ai.Auto_Invoice_ID = p.Auto_Invoice_ID
WHERE c.Customer_ID = 1
GROUP BY 
    c.Customer_ID,
    Customer_Name,
    ap.Auto_Policy_ID,
    ai.Auto_Invoice_ID,
    ai.Invoice_Date,
    ai.Due_Date,
    ai.Invoice_Amount
ORDER BY ai.Invoice_Date;
