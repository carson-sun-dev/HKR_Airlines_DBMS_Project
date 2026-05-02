USE HKR_DB;

-- =========================================================
-- 07_HKR_Part2_Transactions_And_Procedures.sql
-- Purpose:
-- 1. Document transaction handling for concurrency and rollback.
-- 2. Create stored procedures for safer database access.
-- 3. Support customer dashboard queries for policies and invoices.
-- =========================================================


-- =========================================================
-- Transaction Example 1:
-- Create a new auto policy and its invoice as one atomic unit.
--
-- This is for report documentation.
-- Do not run on the final demo database unless testing.
--
-- If any step fails, the whole operation should be rolled back.
-- =========================================================

-- START TRANSACTION;
--
-- INSERT INTO HKR_AUTO_POLICY
-- (Auto_Policy_ID, Start_Date, End_Date, Premium_Amount, Policy_Status, CUSTOMER_ID)
-- VALUES
-- (999, '2026-01-01', '2027-01-01', 1250.00, 'C', 1);
--
-- INSERT INTO HKR_AUTO_INVOICE
-- (Auto_Invoice_ID, Invoice_Date, Due_Date, Invoice_Amount, Auto_Policy_ID)
-- VALUES
-- (999, '2026-01-01', '2026-01-15', 1250.00, 999);
--
-- COMMIT;
--
-- If an error happens before COMMIT, use:
-- ROLLBACK;


-- =========================================================
-- Transaction Example 2:
-- Insert a payment while locking the invoice row.
--
-- SELECT ... FOR UPDATE prevents two users from updating the
-- same invoice payment state at the same time.
--
-- This is for report documentation.
-- Do not run on the final demo database unless testing.
-- =========================================================

-- START TRANSACTION;
--
-- SELECT Auto_Invoice_ID, Invoice_Amount
-- FROM HKR_AUTO_INVOICE
-- WHERE Auto_Invoice_ID = 301
-- FOR UPDATE;
--
-- INSERT INTO HKR_AUTO_PAYMENT
-- (Auto_Payment_ID, Payment_Date, Payment_Method, Payment_Amount, Auto_Invoice_ID)
-- VALUES
-- (999, CURDATE(), 'Credit', 100.00, 301);
--
-- COMMIT;
--
-- If a deadlock occurs, the backend application should catch
-- the deadlock error, rollback the transaction, and retry.


-- =========================================================
-- Stored Procedures
-- These procedures help avoid direct SQL string concatenation
-- in backend code and support SQL injection prevention.
-- =========================================================

DROP PROCEDURE IF EXISTS sp_get_customer_auto_policies;
DROP PROCEDURE IF EXISTS sp_get_customer_home_policies;
DROP PROCEDURE IF EXISTS sp_get_customer_auto_invoice_balance;

DELIMITER $$

-- =========================================================
-- Stored Procedure 1:
-- Get all auto policies for one customer.
-- Used by customer dashboard.
-- =========================================================

CREATE PROCEDURE sp_get_customer_auto_policies(IN p_customer_id BIGINT)
BEGIN
    SELECT
        Auto_Policy_ID,
        Start_Date,
        End_Date,
        Premium_Amount,
        Policy_Status,
        CUSTOMER_ID
    FROM HKR_AUTO_POLICY
    WHERE CUSTOMER_ID = p_customer_id
    ORDER BY Start_Date DESC;
END$$


-- =========================================================
-- Stored Procedure 2:
-- Get all home policies for one customer.
-- Used by customer dashboard.
-- =========================================================

CREATE PROCEDURE sp_get_customer_home_policies(IN p_customer_id BIGINT)
BEGIN
    SELECT
        Home_Policy_ID,
        Start_Date,
        End_Date,
        Premium_Amount,
        Policy_Status,
        CUSTOMER_ID
    FROM HKR_HOME_POLICY
    WHERE CUSTOMER_ID = p_customer_id
    ORDER BY Start_Date DESC;
END$$


-- =========================================================
-- Stored Procedure 3:
-- Get auto invoice and payment balance for one customer.
-- Used by billing page or employee billing review.
-- =========================================================

CREATE PROCEDURE sp_get_customer_auto_invoice_balance(IN p_customer_id BIGINT)
BEGIN
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
    WHERE c.Customer_ID = p_customer_id
    GROUP BY 
        c.Customer_ID,
        Customer_Name,
        ap.Auto_Policy_ID,
        ai.Auto_Invoice_ID,
        ai.Invoice_Date,
        ai.Due_Date,
        ai.Invoice_Amount
    ORDER BY ai.Invoice_Date;
END$$

DELIMITER ;


-- =========================================================
-- Test Procedure Calls
-- Run these after creating the procedures to verify results.
-- =========================================================

CALL sp_get_customer_auto_policies(1);
CALL sp_get_customer_home_policies(1);
CALL sp_get_customer_auto_invoice_balance(1);


-- =========================================================
-- Cleanup SQL for transaction testing only.
-- Do not run unless transaction test data was inserted.
-- These lines are commented out for safety.
-- =========================================================

-- DELETE FROM HKR_AUTO_PAYMENT
-- WHERE Auto_Payment_ID = 999;
--
-- DELETE FROM HKR_AUTO_INVOICE
-- WHERE Auto_Invoice_ID = 999;
--
-- DELETE FROM HKR_AUTO_POLICY
-- WHERE Auto_Policy_ID = 999;