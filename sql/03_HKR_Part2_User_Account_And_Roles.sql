USE HKR_DB;
CREATE TABLE IF NOT EXISTS HKR_USER (
    User_ID BIGINT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Password_Hash VARCHAR(255) NOT NULL,
    Role CHAR(1) NOT NULL COMMENT 'C=Customer, E=Employee, A=Admin',
    Customer_ID BIGINT NULL,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Is_Active BOOLEAN DEFAULT TRUE,
    CONSTRAINT HKR_USER_CUSTOMER_FK
        FOREIGN KEY (Customer_ID)
        REFERENCES HKR_CUSTOMER(CUSTOMER_ID),
    CONSTRAINT HKR_USER_ROLE_CK
        CHECK (
            (Role = 'C' AND Customer_ID IS NOT NULL)
            OR
            (Role IN ('E', 'A') AND Customer_ID IS NULL)
        )
);

INSERT IGNORE INTO HKR_USER
(Username, Password_Hash, Role, Customer_ID)
VALUES
('customer1', '$2b$12$replace_with_bcrypt_hash_for_customer1', 'C', 1),
('customer2', '$2b$12$replace_with_bcrypt_hash_for_customer2', 'C', 2),
('employee1', '$2b$12$replace_with_bcrypt_hash_for_employee1', 'E', NULL),
('admin1', '$2b$12$replace_with_bcrypt_hash_for_admin1', 'A', NULL);

SELECT * FROM HKR_USER;
