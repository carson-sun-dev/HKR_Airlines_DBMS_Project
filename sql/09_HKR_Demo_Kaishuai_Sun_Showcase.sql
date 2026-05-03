-- =========================================================
-- 09_HKR_Demo_Kaishuai_Sun_Showcase.sql
-- 演示用数据：单一客户账号可覆盖门户全部功能（含分页 10/页 → 13 条列表）
--
-- 客户档案（HKR_CUSTOMER 无电话列；演示联系电话见下方注释）
--   姓名: Kaishuai Sun
--   地址: 6 MetroTech Center, Brooklyn, NY 11201
--   演示用联系电话: 212-671-2733
--
-- 登录（HKR_USER，Werkzeug pbkdf2:sha256）
--   Username: kaishuaisun
--   Password: 123123
--   Role: C, CUSTOMER_ID: 990
--
-- 注册页若需绑定客户号: 990
--
-- 执行前提: 已 USE HKR_DB，且已执行 01、02、08（或至少 01+08，本脚本自带客户行）
-- 推荐顺序: 01 → 02 → … → 08 → 本文件 09
-- 主键区间 8001–8153、9001–9013 等与 02 样本不重叠
-- =========================================================

USE HKR_DB;

-- 可重复执行：先清掉本演示批次（关闭外键检查以便顺序简单）
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM HKR_USER WHERE Username IN ('kaishuaisun', 'kaishuai_sun');
DELETE FROM HKR_HOME_PAYMENT WHERE Home_Payment_ID BETWEEN 8091 AND 8102;
DELETE FROM HKR_AUTO_PAYMENT WHERE Auto_Payment_ID BETWEEN 8071 AND 8082;
DELETE FROM HKR_HOME_INVOICE WHERE Home_Invoice_ID BETWEEN 8051 AND 8063;
DELETE FROM HKR_AUTO_INVOICE WHERE Auto_Invoice_ID BETWEEN 8031 AND 8043;
DELETE FROM HKR_DRIVER_VEHICLE WHERE Driver_ID BETWEEN 9001 AND 9013;
DELETE FROM HKR_INSURED_VEHICLE WHERE Vehicle_ID BETWEEN 8121 AND 8133;
DELETE FROM HKR_INSURED_HOME WHERE Home_ID BETWEEN 8141 AND 8153;
DELETE FROM HKR_DRIVER WHERE Driver_ID BETWEEN 9001 AND 9013;
DELETE FROM HKR_AUTO_POLICY WHERE Auto_Policy_ID BETWEEN 8001 AND 8013;
DELETE FROM HKR_HOME_POLICY WHERE Home_Policy_ID BETWEEN 8021 AND 8033;
DELETE FROM HKR_CUSTOMER WHERE CUSTOMER_ID = 990;
SET FOREIGN_KEY_CHECKS = 1;

-- 客户（Customer_Type = B：车险+家险）
INSERT INTO HKR_CUSTOMER (
    CUSTOMER_ID, First_Name, Last_Name, Street_Address, City, State, Zip_Code,
    Gender, Marital_Status, Customer_Type
) VALUES (
    990, 'Kaishuai', 'Sun', '6 MetroTech Center', 'Brooklyn', 'NY', '11201',
    'M', 'S', 'B'
);

-- Web 登录（密码 123123）
INSERT INTO HKR_USER (Username, Password_Hash, Role, CUSTOMER_ID) VALUES (
    'kaishuaisun',
    'pbkdf2:sha256:1000000$yh9rUScx71DHi83m$099e2c95a4bf5c1ceb52a7a3092def66f77b55bf65f9e33e888af3bdad2aa6c3',
    'C',
    990
);

-- 13 份车险保单 → Browse 分页第 2 页有数据
INSERT INTO HKR_AUTO_POLICY (
    Auto_Policy_ID, Start_Date, End_Date, Premium_Amount, Policy_Status, CUSTOMER_ID
) VALUES
(8001, '2025-01-01', '2026-01-01', 1188.50, 'C', 990),
(8002, '2025-02-01', '2026-02-01', 1240.00, 'C', 990),
(8003, '2025-03-01', '2026-03-01',  995.25, 'C', 990),
(8004, '2025-04-01', '2026-04-01', 1325.75, 'C', 990),
(8005, '2025-05-01', '2026-05-01', 1105.00, 'C', 990),
(8006, '2025-06-01', '2026-06-01', 1410.00, 'C', 990),
(8007, '2025-07-01', '2026-07-01',  979.99, 'C', 990),
(8008, '2025-08-01', '2026-08-01', 1288.00, 'C', 990),
(8009, '2025-09-01', '2026-09-01', 1155.50, 'C', 990),
(8010, '2025-10-01', '2026-10-01', 1375.25, 'C', 990),
(8011, '2025-11-01', '2026-11-01', 1022.00, 'C', 990),
(8012, '2025-12-01', '2026-12-01', 1299.00, 'C', 990),
(8013, '2024-06-01', '2025-06-01', 1190.00, 'E', 990);

-- 13 份家财险保单
INSERT INTO HKR_HOME_POLICY (
    Home_Policy_ID, Start_Date, End_Date, Premium_Amount, Policy_Status, CUSTOMER_ID
) VALUES
(8021, '2025-01-01', '2026-01-01', 1688.00, 'C', 990),
(8022, '2025-02-01', '2026-02-01', 1755.50, 'C', 990),
(8023, '2025-03-01', '2026-03-01', 1590.00, 'C', 990),
(8024, '2025-04-01', '2026-04-01', 1820.25, 'C', 990),
(8025, '2025-05-01', '2026-05-01', 1644.00, 'C', 990),
(8026, '2025-06-01', '2026-06-01', 1910.00, 'C', 990),
(8027, '2025-07-01', '2026-07-01', 1525.75, 'C', 990),
(8028, '2025-08-01', '2026-08-01', 1788.00, 'C', 990),
(8029, '2025-09-01', '2026-09-01', 1610.50, 'C', 990),
(8030, '2025-10-01', '2026-10-01', 1855.00, 'C', 990),
(8031, '2025-11-01', '2026-11-01', 1577.25, 'C', 990),
(8032, '2025-12-01', '2026-12-01', 1722.00, 'C', 990),
(8033, '2024-07-01', '2025-07-01', 1650.00, 'E', 990);

-- 车险账单（每单一张；金额与保费一致便于核对）
INSERT INTO HKR_AUTO_INVOICE (
    Auto_Invoice_ID, Invoice_Date, Due_Date, Invoice_Amount, Auto_Policy_ID
) VALUES
(8031, '2025-01-05', '2025-01-20', 1188.50, 8001),
(8032, '2025-02-05', '2025-02-20', 1240.00, 8002),
(8033, '2025-03-05', '2025-03-20',  995.25, 8003),
(8034, '2025-04-05', '2025-04-20', 1325.75, 8004),
(8035, '2025-05-05', '2025-05-20', 1105.00, 8005),
(8036, '2025-06-05', '2025-06-20', 1410.00, 8006),
(8037, '2025-07-05', '2025-07-20',  979.99, 8007),
(8038, '2025-08-05', '2025-08-20', 1288.00, 8008),
(8039, '2025-09-05', '2025-09-20', 1155.50, 8009),
(8040, '2025-10-05', '2025-10-20', 1375.25, 8010),
(8041, '2025-11-05', '2025-11-20', 1022.00, 8011),
(8042, '2025-12-05', '2025-12-20', 1299.00, 8012),
(8043, '2024-06-10', '2024-06-25', 1190.00, 8013);

-- 家财险账单
INSERT INTO HKR_HOME_INVOICE (
    Home_Invoice_ID, Invoice_Date, Due_Date, Invoice_Amount, Home_Policy_ID
) VALUES
(8051, '2025-01-05', '2025-01-20', 1688.00, 8021),
(8052, '2025-02-05', '2025-02-20', 1755.50, 8022),
(8053, '2025-03-05', '2025-03-20', 1590.00, 8023),
(8054, '2025-04-05', '2025-04-20', 1820.25, 8024),
(8055, '2025-05-05', '2025-05-20', 1644.00, 8025),
(8056, '2025-06-05', '2025-06-20', 1910.00, 8026),
(8057, '2025-07-05', '2025-07-20', 1525.75, 8027),
(8058, '2025-08-05', '2025-08-20', 1788.00, 8028),
(8059, '2025-09-05', '2025-09-20', 1610.50, 8029),
(8060, '2025-10-05', '2025-10-20', 1855.00, 8030),
(8061, '2025-11-05', '2025-11-20', 1577.25, 8031),
(8062, '2025-12-05', '2025-12-20', 1722.00, 8032),
(8063, '2024-07-10', '2024-07-25', 1650.00, 8033);

-- 车险付款：前 12 张已付；8043 对应过期保单账单 → 留作「Report a payment」演示
INSERT INTO HKR_AUTO_PAYMENT (
    Auto_Payment_ID, Payment_Date, Payment_Method, Payment_Amount, Auto_Invoice_ID
) VALUES
(8071, '2025-01-12', 'Credit',  1188.50, 8031),
(8072, '2025-02-12', 'PayPal',  1240.00, 8032),
(8073, '2025-03-12', 'Debit',    995.25, 8033),
(8074, '2025-04-12', 'Check',   1325.75, 8034),
(8075, '2025-05-12', 'Credit',  1105.00, 8035),
(8076, '2025-06-12', 'PayPal',  1410.00, 8036),
(8077, '2025-07-12', 'Debit',    979.99, 8037),
(8078, '2025-08-12', 'Check',   1288.00, 8038),
(8079, '2025-09-12', 'Credit',  1155.50, 8039),
(8080, '2025-10-12', 'PayPal',  1375.25, 8040),
(8081, '2025-11-12', 'Debit',   1022.00, 8041),
(8082, '2025-12-12', 'Check',   1299.00, 8042);

-- 家财险付款：同上，8063 未付
INSERT INTO HKR_HOME_PAYMENT (
    Home_Payment_ID, Payment_Date, Payment_Method, Payment_Amount, Home_Invoice_ID
) VALUES
(8091, '2025-01-12', 'Credit',  1688.00, 8051),
(8092, '2025-02-12', 'PayPal',  1755.50, 8052),
(8093, '2025-03-12', 'Debit',   1590.00, 8053),
(8094, '2025-04-12', 'Check',   1820.25, 8054),
(8095, '2025-05-12', 'Credit',  1644.00, 8055),
(8096, '2025-06-12', 'PayPal',  1910.00, 8056),
(8097, '2025-07-12', 'Debit',   1525.75, 8057),
(8098, '2025-08-12', 'Check',   1788.00, 8058),
(8099, '2025-09-12', 'Credit',  1610.50, 8059),
(8100, '2025-10-12', 'PayPal',  1855.00, 8060),
(8101, '2025-11-12', 'Debit',   1577.25, 8061),
(8102, '2025-12-12', 'Check',   1722.00, 8062);

-- 承保车辆：每份车险一单一台车；VIN 17 位全库唯一
INSERT INTO HKR_INSURED_VEHICLE (
    Vehicle_ID, VIN, Make_Model_Year, Vehicle_Status, Auto_Policy_ID
) VALUES
(8121, 'KAISHUAI0SUN00001', 'Toyota Camry Hybrid 2024', 'O', 8001),
(8122, 'KAISHUAI0SUN00002', 'Honda Accord 2023', 'F', 8002),
(8123, 'KAISHUAI0SUN00003', 'Tesla Model 3 2025', 'L', 8003),
(8124, 'KAISHUAI0SUN00004', 'Subaru Outback 2022', 'O', 8004),
(8125, 'KAISHUAI0SUN00005', 'Ford F-150 Lightning 2024', 'F', 8005),
(8126, 'KAISHUAI0SUN00006', 'BMW 330i 2023', 'L', 8006),
(8127, 'KAISHUAI0SUN00007', 'Hyundai Ioniq 5 2024', 'O', 8007),
(8128, 'KAISHUAI0SUN00008', 'Mazda CX-50 2023', 'F', 8008),
(8129, 'KAISHUAI0SUN00009', 'Volkswagen ID.4 2024', 'L', 8009),
(8130, 'KAISHUAI0SUN00010', 'Lexus RX 350 2022', 'O', 8010),
(8131, 'KAISHUAI0SUN00011', 'Kia EV6 2024', 'F', 8011),
(8132, 'KAISHUAI0SUN00012', 'Mercedes GLC 300 2023', 'L', 8012),
(8133, 'KAISHUAI0SUN00013', 'Nissan Altima 2021', 'O', 8013);

-- 承保房屋：每份家财险对应一处房产
INSERT INTO HKR_INSURED_HOME (
    Home_ID, Purchase_Date, Purchase_Value, Area_Sq_Ft, Home_Type,
    Auto_Fire_Notification, Home_Security_System, Swimming_Pool, Basement, Home_Policy_ID
) VALUES
(8141, '2019-04-10', 425000.00, 1650, 'C', '1', '1', NULL, '0', 8021),
(8142, '2020-08-20', 510000.00, 2100, 'S', '1', '1', 'U', '1', 8022),
(8143, '2018-01-15', 380000.00, 1420, 'T', '0', '1', NULL, '1', 8023),
(8144, '2021-11-01', 620000.00, 2400, 'S', '1', '1', 'O', '1', 8024),
(8145, '2017-06-30', 335000.00, 1380, 'M', '1', '0', 'I', '0', 8025),
(8146, '2022-03-22', 715000.00, 2800, 'S', '1', '1', 'M', '1', 8026),
(8147, '2016-09-05', 298000.00, 1250, 'C', '0', '0', NULL, '0', 8027),
(8148, '2023-05-18', 540000.00, 1950, 'M', '1', '1', NULL, '1', 8028),
(8149, '2015-12-12', 315000.00, 1550, 'T', '1', '0', NULL, '0', 8029),
(8150, '2020-02-28', 485000.00, 2200, 'S', '0', '1', 'U', '1', 8030),
(8151, '2019-07-07', 455000.00, 1880, 'C', '1', '1', NULL, '0', 8031),
(8152, '2021-10-10', 590000.00, 2300, 'S', '1', '1', NULL, '1', 8032),
(8153, '2014-04-04', 365000.00, 1600, 'T', '1', '0', 'O', '0', 8033);

-- 驾驶员（与 Kaishuai 同姓或家庭成员风格）；通过 DRIVER_VEHICLE 挂到车辆
INSERT INTO HKR_DRIVER (Driver_ID, License_Number, First_Name, Last_Name, Age) VALUES
(9001, 'KSNY-DL-099001', 'Kaishuai', 'Sun', 28),
(9002, 'KSNY-DL-099002', 'Wei', 'Chen', 31),
(9003, 'KSNY-DL-099003', 'Alex', 'Sun', 45),
(9004, 'KSNY-DL-099004', 'Jordan', 'Lee', 26),
(9005, 'KSNY-DL-099005', 'Sam', 'Patel', 34),
(9006, 'KSNY-DL-099006', 'Riley', 'Nguyen', 22),
(9007, 'KSNY-DL-099007', 'Casey', 'Brown', 39),
(9008, 'KSNY-DL-099008', 'Morgan', 'Davis', 29),
(9009, 'KSNY-DL-099009', 'Taylor', 'Wilson', 41),
(9010, 'KSNY-DL-099010', 'Jamie', 'Garcia', 24),
(9011, 'KSNY-DL-099011', 'Quinn', 'Martinez', 36),
(9012, 'KSNY-DL-099012', 'Avery', 'Rodriguez', 27),
(9013, 'KSNY-DL-099013', 'Reese', 'Kim', 33);

-- 每人绑定一台承保车（与 /api/me/records/driver 列表一致）
INSERT INTO HKR_DRIVER_VEHICLE (Driver_ID, Vehicle_ID) VALUES
(9001, 8121),
(9002, 8122),
(9003, 8123),
(9004, 8124),
(9005, 8125),
(9006, 8126),
(9007, 8127),
(9008, 8128),
(9009, 8129),
(9010, 8130),
(9011, 8131),
(9012, 8132),
(9013, 8133);

SELECT 'HKR demo Kaishuai Sun loaded: CUSTOMER_ID=990, login kaishuaisun / 123123' AS status;
