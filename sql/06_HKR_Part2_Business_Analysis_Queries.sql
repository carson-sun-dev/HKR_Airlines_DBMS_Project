USE HKR_DB;

-- =========================================================
-- Q1: Table joins with at least 3 tables
-- Business Purpose:
-- Find each auto insurance invoice, how much has been paid,
-- and the remaining balance.
-- =========================================================

SELECT
    c.Customer_ID AS Customer_ID,
    CONCAT(c.First_Name, ' ', c.Last_Name) AS Customer_Name,
    ap.Auto_Policy_ID AS Auto_Policy_ID,
    ai.Auto_Invoice_ID AS Invoice_ID,
    ai.Invoice_Amount AS Invoice_Amount,
    COALESCE(SUM(p.Payment_Amount), 0) AS Total_Paid,
    ai.Invoice_Amount - COALESCE(SUM(p.Payment_Amount), 0) AS Balance_Due
FROM HKR_CUSTOMER c
JOIN HKR_AUTO_POLICY ap
    ON c.Customer_ID = ap.CUSTOMER_ID
JOIN HKR_AUTO_INVOICE ai
    ON ap.Auto_Policy_ID = ai.Auto_Policy_ID
LEFT JOIN HKR_AUTO_PAYMENT p
    ON ai.Auto_Invoice_ID = p.Auto_Invoice_ID
GROUP BY 
    c.Customer_ID,
    Customer_Name,
    ap.Auto_Policy_ID,
    ai.Auto_Invoice_ID,
    ai.Invoice_Amount
ORDER BY Balance_Due DESC, Customer_ID;


-- =========================================================
-- Q2: Multi-row subquery
-- Business Purpose:
-- Identify customers who currently have at least one active
-- auto insurance policy.
-- =========================================================

SELECT
    Customer_ID AS Customer_ID,
    CONCAT(First_Name, ' ', Last_Name) AS Customer_Name,
    Customer_Type AS Customer_Type
FROM HKR_CUSTOMER
WHERE Customer_ID IN (
    SELECT CUSTOMER_ID
    FROM HKR_AUTO_POLICY
    WHERE Policy_Status = 'C'
)
ORDER BY Customer_ID;


-- =========================================================
-- Q3: Correlated subquery
-- Business Purpose:
-- Find auto policies whose premium is higher than the average
-- auto premium of the same customer.
-- =========================================================

SELECT
    ap.Auto_Policy_ID AS Auto_Policy_ID,
    ap.CUSTOMER_ID AS Customer_ID,
    CONCAT(c.First_Name, ' ', c.Last_Name) AS Customer_Name,
    ap.Premium_Amount AS Premium_Amount,
    ap.Policy_Status AS Policy_Status
FROM HKR_AUTO_POLICY ap
JOIN HKR_CUSTOMER c
    ON ap.CUSTOMER_ID = c.Customer_ID
WHERE ap.Premium_Amount > (
    SELECT AVG(ap2.Premium_Amount)
    FROM HKR_AUTO_POLICY ap2
    WHERE ap2.CUSTOMER_ID = ap.CUSTOMER_ID
)
ORDER BY ap.CUSTOMER_ID, ap.Premium_Amount DESC;


-- =========================================================
-- Q4: SET operator query
-- Business Purpose:
-- Identify customers who purchased both auto and home
-- insurance products.
-- Note:
-- MySQL 8.0.31+ supports INTERSECT. If this query gives an
-- error, run the alternative version below.
-- =========================================================

SELECT CUSTOMER_ID
FROM HKR_AUTO_POLICY

INTERSECT

SELECT CUSTOMER_ID
FROM HKR_HOME_POLICY;


-- =========================================================
-- Q4 Alternative: Equivalent set-intersection logic
-- Business Purpose:
-- Identify customers who purchased both auto and home
-- insurance products.
-- Use this only if INTERSECT does not work in your MySQL.
-- =========================================================

SELECT DISTINCT
    c.Customer_ID AS Customer_ID,
    CONCAT(c.First_Name, ' ', c.Last_Name) AS Customer_Name
FROM HKR_CUSTOMER c
WHERE c.Customer_ID IN (
    SELECT CUSTOMER_ID FROM HKR_AUTO_POLICY
)
AND c.Customer_ID IN (
    SELECT CUSTOMER_ID FROM HKR_HOME_POLICY
)
ORDER BY c.Customer_ID;


-- =========================================================
-- Q5: Query with WITH clause
-- Business Purpose:
-- Analyze customer count and average total premium by state
-- for regional business performance.
-- =========================================================

WITH CustomerPremium AS (
    SELECT
        c.Customer_ID,
        c.State,
        COALESCE(SUM(DISTINCT ap.Premium_Amount), 0) AS Auto_Premium,
        COALESCE(SUM(DISTINCT hp.Premium_Amount), 0) AS Home_Premium
    FROM HKR_CUSTOMER c
    LEFT JOIN HKR_AUTO_POLICY ap
        ON c.Customer_ID = ap.CUSTOMER_ID
    LEFT JOIN HKR_HOME_POLICY hp
        ON c.Customer_ID = hp.CUSTOMER_ID
    GROUP BY c.Customer_ID, c.State
)
SELECT
    State AS State,
    COUNT(Customer_ID) AS Customer_Count,
    ROUND(AVG(Auto_Premium + Home_Premium), 2) AS Avg_Total_Premium
FROM CustomerPremium
GROUP BY State
ORDER BY Avg_Total_Premium DESC;


-- =========================================================
-- Q6: TOP-N query
-- Business Purpose:
-- Identify the top 5 customers by total premium contribution
-- across auto and home insurance.
-- =========================================================

SELECT
    c.Customer_ID AS Customer_ID,
    CONCAT(c.First_Name, ' ', c.Last_Name) AS Customer_Name,
    ROUND(
        COALESCE(auto_tot.Auto_Total_Premium, 0)
        + COALESCE(home_tot.Home_Total_Premium, 0),
        2
    ) AS Total_Premium
FROM HKR_CUSTOMER c
LEFT JOIN (
    SELECT CUSTOMER_ID, SUM(Premium_Amount) AS Auto_Total_Premium
    FROM HKR_AUTO_POLICY
    GROUP BY CUSTOMER_ID
) auto_tot
    ON c.Customer_ID = auto_tot.CUSTOMER_ID
LEFT JOIN (
    SELECT CUSTOMER_ID, SUM(Premium_Amount) AS Home_Total_Premium
    FROM HKR_HOME_POLICY
    GROUP BY CUSTOMER_ID
) home_tot
    ON c.Customer_ID = home_tot.CUSTOMER_ID
ORDER BY Total_Premium DESC
LIMIT 5;