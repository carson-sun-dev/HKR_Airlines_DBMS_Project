DROP DATABASE IF EXISTS HKR_DB;
CREATE DATABASE HKR_DB;
USE HKR_DB;

CREATE TABLE HKR_CUSTOMER
(
    CUSTOMER_ID BIGINT NOT NULL,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Street_Address VARCHAR(100) NOT NULL,
    City VARCHAR(50) NOT NULL,
    State CHAR(2) NOT NULL,
    Zip_Code VARCHAR(10) NOT NULL,
    Gender CHAR(1) COMMENT 'M=Male, F=Female, null=Not provided',
    Marital_Status CHAR(1) NOT NULL COMMENT 'M=Married, S=Single, W=Widow/Widower',
    Customer_Type CHAR(1) NOT NULL COMMENT 'A=Auto, H=Home, B=Both',
    PRIMARY KEY (CUSTOMER_ID),
    CONSTRAINT HKR_CUSTOMER_CK_1 CHECK (Gender IS NULL OR Gender IN ('F','M')),
    CONSTRAINT HKR_CUSTOMER_CK_2 CHECK (Marital_Status IN ('M','S','W')),
    CONSTRAINT HKR_CUSTOMER_CK_3 CHECK (Customer_Type IN ('A','B','H'))
);

CREATE TABLE HKR_DRIVER
(
    Driver_ID BIGINT NOT NULL,
    License_Number VARCHAR(20) NOT NULL,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Age SMALLINT NOT NULL COMMENT 'Must be 16 or older',
    PRIMARY KEY (Driver_ID),
    UNIQUE (License_Number),
    CONSTRAINT HKR_DRIVER_CK_1 CHECK (Age BETWEEN 16 AND 100)
);

CREATE TABLE HKR_AUTO_POLICY
(
    Auto_Policy_ID BIGINT NOT NULL,
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    Premium_Amount DECIMAL(10,2) NOT NULL,
    Policy_Status CHAR(1) NOT NULL COMMENT 'C=Current, E=Expired',
    CUSTOMER_ID BIGINT NOT NULL,
    PRIMARY KEY (Auto_Policy_ID),
    CONSTRAINT HKR_AUTO_POLICY_CK_1 CHECK (Policy_Status IN ('C','E')),
    CONSTRAINT HKR_AUTO_POLICY_CK_2 CHECK (Start_Date < End_Date),
    CONSTRAINT HKR_AUTO_POLICY_CK_3 CHECK (Premium_Amount > 0),
    CONSTRAINT HKR_APOL_CUST_FK FOREIGN KEY (CUSTOMER_ID)
        REFERENCES HKR_CUSTOMER(CUSTOMER_ID)
);

CREATE TABLE HKR_HOME_POLICY
(
    Home_Policy_ID BIGINT NOT NULL,
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    Premium_Amount DECIMAL(10,2) NOT NULL,
    Policy_Status CHAR(1) NOT NULL COMMENT 'C=Current, E=Expired',
    CUSTOMER_ID BIGINT NOT NULL,
    PRIMARY KEY (Home_Policy_ID),
    CONSTRAINT HKR_HOME_POLICY_CK_1 CHECK (Policy_Status IN ('C','E')),
    CONSTRAINT HKR_HOME_POLICY_CK_2 CHECK (Start_Date < End_Date),
    CONSTRAINT HKR_HOME_POLICY_CK_3 CHECK (Premium_Amount > 0),
    CONSTRAINT HKR_HPOL_CUST_FK FOREIGN KEY (CUSTOMER_ID)
        REFERENCES HKR_CUSTOMER(CUSTOMER_ID)
);

CREATE TABLE HKR_AUTO_INVOICE
(
    Auto_Invoice_ID BIGINT NOT NULL,
    Invoice_Date DATE NOT NULL,
    Due_Date DATE NOT NULL,
    Invoice_Amount DECIMAL(10,2) NOT NULL,
    Auto_Policy_ID BIGINT NOT NULL,
    PRIMARY KEY (Auto_Invoice_ID),
    CONSTRAINT HKR_AUTO_INVOICE_CK_1 CHECK (Due_Date >= Invoice_Date),
    CONSTRAINT HKR_AUTO_INVOICE_CK_2 CHECK (Invoice_Amount > 0),
    CONSTRAINT HKR_AINV_APOL_FK FOREIGN KEY (Auto_Policy_ID)
        REFERENCES HKR_AUTO_POLICY(Auto_Policy_ID)
);

CREATE TABLE HKR_HOME_INVOICE
(
    Home_Invoice_ID BIGINT NOT NULL,
    Invoice_Date DATE NOT NULL,
    Due_Date DATE NOT NULL,
    Invoice_Amount DECIMAL(10,2) NOT NULL,
    Home_Policy_ID BIGINT NOT NULL,
    PRIMARY KEY (Home_Invoice_ID),
    CONSTRAINT HKR_HOME_INVOICE_CK_1 CHECK (Due_Date >= Invoice_Date),
    CONSTRAINT HKR_HOME_INVOICE_CK_2 CHECK (Invoice_Amount > 0),
    CONSTRAINT HKR_HINV_HPOL_FK FOREIGN KEY (Home_Policy_ID)
        REFERENCES HKR_HOME_POLICY(Home_Policy_ID)
);

CREATE TABLE HKR_AUTO_PAYMENT
(
    Auto_Payment_ID BIGINT NOT NULL,
    Payment_Date DATE NOT NULL,
    Payment_Method VARCHAR(20) NOT NULL COMMENT 'PayPal, Credit, Debit, or Check',
    Payment_Amount DECIMAL(10,2) NOT NULL,
    Auto_Invoice_ID BIGINT NOT NULL,
    PRIMARY KEY (Auto_Payment_ID),
    CONSTRAINT HKR_AUTO_PAYMENT_CK_1 CHECK (Payment_Method IN ('Check','Credit','Debit','PayPal')),
    CONSTRAINT HKR_AUTO_PAYMENT_CK_2 CHECK (Payment_Amount > 0),
    CONSTRAINT HKR_APAY_AINV_FK FOREIGN KEY (Auto_Invoice_ID)
        REFERENCES HKR_AUTO_INVOICE(Auto_Invoice_ID)
);

CREATE TABLE HKR_HOME_PAYMENT
(
    Home_Payment_ID BIGINT NOT NULL,
    Payment_Date DATE NOT NULL,
    Payment_Method VARCHAR(20) NOT NULL COMMENT 'PayPal, Credit, Debit, or Check',
    Payment_Amount DECIMAL(10,2) NOT NULL,
    Home_Invoice_ID BIGINT NOT NULL,
    PRIMARY KEY (Home_Payment_ID),
    CONSTRAINT HKR_HOME_PAYMENT_CK_1 CHECK (Payment_Method IN ('Check','Credit','Debit','PayPal')),
    CONSTRAINT HKR_HOME_PAYMENT_CK_2 CHECK (Payment_Amount > 0),
    CONSTRAINT HKR_HPAY_HINV_FK FOREIGN KEY (Home_Invoice_ID)
        REFERENCES HKR_HOME_INVOICE(Home_Invoice_ID)
);

CREATE TABLE HKR_INSURED_HOME
(
    Home_ID BIGINT NOT NULL,
    Purchase_Date DATE NOT NULL,
    Purchase_Value DECIMAL(12,2) NOT NULL,
    Area_Sq_Ft INT NOT NULL,
    Home_Type CHAR(1) NOT NULL COMMENT 'S=Single Family, M=Multi Family, C=Condominium, T=Townhouse',
    Auto_Fire_Notification CHAR(1) NOT NULL COMMENT '1=Fire notification exists, 0=No fire notification',
    Home_Security_System CHAR(1) NOT NULL COMMENT '1=Security system monitored, 0=Not installed or monitored',
    Swimming_Pool CHAR(1) COMMENT 'U=Underground, O=Overground, I=Indoor, M=Multiple, null=No pool',
    Basement CHAR(1) NOT NULL COMMENT '1=Has basement, 0=No basement',
    Home_Policy_ID BIGINT NOT NULL,
    PRIMARY KEY (Home_ID),
    CONSTRAINT HKR_INSURED_HOME_CK_1 CHECK (Home_Type IN ('C','M','S','T')),
    CONSTRAINT HKR_INSURED_HOME_CK_2 CHECK (Auto_Fire_Notification IN ('0','1')),
    CONSTRAINT HKR_INSURED_HOME_CK_3 CHECK (Home_Security_System IN ('0','1')),
    CONSTRAINT HKR_INSURED_HOME_CK_4 CHECK (Swimming_Pool IS NULL OR Swimming_Pool IN ('I','M','O','U')),
    CONSTRAINT HKR_INSURED_HOME_CK_5 CHECK (Basement IN ('0','1')),
    CONSTRAINT HKR_INSURED_HOME_CK_6 CHECK (Purchase_Value > 0),
    CONSTRAINT HKR_INSURED_HOME_CK_7 CHECK (Area_Sq_Ft > 0),
    CONSTRAINT HKR_IHOME_HPOL_FK FOREIGN KEY (Home_Policy_ID)
        REFERENCES HKR_HOME_POLICY(Home_Policy_ID)
);

CREATE TABLE HKR_INSURED_VEHICLE
(
    Vehicle_ID BIGINT NOT NULL,
    VIN VARCHAR(17) NOT NULL COMMENT 'Vehicle Identification Number, must be unique',
    Make_Model_Year VARCHAR(100) NOT NULL COMMENT 'Format: Make Model Year, e.g. Toyota Camry 2022',
    Vehicle_Status CHAR(1) NOT NULL COMMENT 'L=Leased, F=Financed, O=Owned',
    Auto_Policy_ID BIGINT NOT NULL,
    PRIMARY KEY (Vehicle_ID),
    UNIQUE (VIN),
    CONSTRAINT HKR_INSURED_VEHICLE_CK_1 CHECK (Vehicle_Status IN ('F','L','O')),
    CONSTRAINT HKR_INSURED_VEHICLE_CK_2 CHECK (CHAR_LENGTH(VIN) = 17),
    CONSTRAINT HKR_INSURED_VEHICLE_CK_3 CHECK (VIN NOT LIKE '% %'),
    CONSTRAINT HKR_IVEH_APOL_FK FOREIGN KEY (Auto_Policy_ID)
        REFERENCES HKR_AUTO_POLICY(Auto_Policy_ID)
);

CREATE TABLE HKR_DRIVER_VEHICLE
(
    Driver_ID BIGINT NOT NULL,
    Vehicle_ID BIGINT NOT NULL,
    PRIMARY KEY (Driver_ID, Vehicle_ID),
    CONSTRAINT HKR_DRV_VEH_DRV_FK FOREIGN KEY (Driver_ID)
        REFERENCES HKR_DRIVER(Driver_ID),
    CONSTRAINT HKR_DRV_VEH_IVEH_FK FOREIGN KEY (Vehicle_ID)
        REFERENCES HKR_INSURED_VEHICLE(Vehicle_ID)
);

ALTER TABLE HKR_DRIVER_VEHICLE COMMENT 'M:N relationship between driver and vehicle';