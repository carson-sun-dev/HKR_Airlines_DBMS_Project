-- =========================================================
-- 08_HKR_Web_Backend_User_Table.sql
-- 中文说明：
--   Flask 后端 (src/app.py) 的注册 / 登录 / JWT 刷新使用表 HKR_USER，
--   字段为 Username, Password_Hash, Role('C'|'E'), CUSTOMER_ID。
--   作业脚本 01 未包含该表；03 中的 HKR_USER_ACCOUNT 与后端不一致，不能替代。
-- 执行前提：
--   已 USE HKR_DB，且 HKR_CUSTOMER 已存在（至少先执行 01，若需示例客户再执行 02）。
-- 推荐顺序：01 → 02 → 04 → 05 → 06 → 07（按需）→ 本文件 08。
--   若已执行 03（HKR_USER_ACCOUNT），可与本表并存，无冲突。
-- =========================================================

USE HKR_DB;

-- 若重复执行本脚本，先删除再建（无其它表外键指向 HKR_USER）
DROP TABLE IF EXISTS HKR_USER;

CREATE TABLE HKR_USER (
    User_ID       BIGINT AUTO_INCREMENT PRIMARY KEY,
    Username      VARCHAR(50) NOT NULL,
    Password_Hash VARCHAR(255) NOT NULL COMMENT 'Werkzeug generate_password_hash 输出',
    Role          CHAR(1) NOT NULL COMMENT 'C=Customer, E=Employee',
    CUSTOMER_ID   BIGINT NULL COMMENT '客户登录时必填；员工为 NULL',

    CONSTRAINT HKR_USER_UK_Username UNIQUE (Username),
    CONSTRAINT HKR_USER_CK_Role CHECK (Role IN ('C', 'E')),
    CONSTRAINT HKR_USER_CK_Role_Customer CHECK (
        (Role = 'C' AND CUSTOMER_ID IS NOT NULL)
        OR (Role = 'E' AND CUSTOMER_ID IS NULL)
    ),
    CONSTRAINT HKR_USER_FK_Customer FOREIGN KEY (CUSTOMER_ID)
        REFERENCES HKR_CUSTOMER (CUSTOMER_ID)
) COMMENT = 'Web 应用登录注册表，与 src/app.py 一致';

-- ------------------------------------------------------------
-- 示例账号（便于联调；生产环境请删除或改密）
--   demo_customer / password123  → 客户，绑定 CUSTOMER_ID = 1
--   demo_employee / emp123       → 员工
-- 密码哈希由 Werkzeug pbkdf2:sha256 生成，与 check_password_hash 兼容。
-- ------------------------------------------------------------
INSERT INTO HKR_USER (Username, Password_Hash, Role, CUSTOMER_ID) VALUES
(
    'demo_customer',
    'pbkdf2:sha256:1000000$HgQBRpGvlQvXHbKW$104357b1c9837fd15c935e8ba31cebb1cfed4afdfe995704d67afbbb2e61a8e0',
    'C',
    1
),
(
    'demo_employee',
    'pbkdf2:sha256:1000000$EdvLtjWWcTcm1iHc$46ca21946365bbcf43e530f9c84ced91446c14c3bc71f46dedea4c87d064db16',
    'E',
    NULL
);

SELECT User_ID, Username, Role, CUSTOMER_ID FROM HKR_USER;
