# Backend API Handoff Documentation

**Base API URL:** `http://localhost:5000` (Update this if hosted elsewhere)

**Data Format:** All requests and responses use `application/json`. Ensure your fetch/axios calls include the header `Content-Type: application/json`.

**Authentication Strategy (dual mode):**

1. **Session cookie（兼容旧说明）**  
   登录成功后 Flask 仍会写入 session；浏览器携带 Cookie 时，后续请求可不带 `Authorization` 头（需 `credentials: 'include'` / `withCredentials: true`）。

2. **双 JWT Token（推荐 SPA + 加分项：缓存/刷新）**  
   `POST /api/login` 成功时除 `role` 外还会返回：
   - `access_token`：短期访问令牌（默认约 15 分钟，见环境变量 `JWT_ACCESS_MINUTES`）
   - `refresh_token`：长期刷新令牌（默认约 7 天，见 `JWT_REFRESH_DAYS`）
   - `token_type`: `"Bearer"`，`expires_in`：秒数  

   后续业务请求在请求头加入：`Authorization: Bearer <access_token>`。  
   当 `access_token` 过期时，使用 `POST /api/refresh` 传入 `refresh_token` 换取新的 access/refresh（前端可将 refresh 存 `sessionStorage` 等并配合 axios 拦截器自动刷新）。

3. **员工仪表盘统计（图表数据源）**  
   `GET /api/stats/overview`（需登录且角色为员工 `E`）：返回车险/家险保单数、保费合计、客户数等聚合 JSON，供前端 Recharts 等可视化。

---

## Role-Based Access Control (RBAC) Notes

- **(Employee Only):** This endpoint requires the logged-in user to have the Role `E`. Customers will receive a `403 Forbidden` error.

- **(Customer/Self):** Customers can use these GET or PUT endpoints, but the backend restricts them to only viewing or modifying their own data.

---

## 1. Authentication (HKR_USER)

### Register a User

**Method:** `POST /api/register`

**Body:**
```json
{"username": "jdoe", "password": "password123", "role": "C", "customer_id": 101}
```

**Notes:** `role` must be `'C'` (Customer) or `'E'` (Employee). `customer_id` is required for customers, `null` for employees.

---

### Login

**Method:** `POST /api/login`

**Body:**
```json
{"username": "jdoe", "password": "password123"}
```

**Success Response:** `200 OK` — 至少包含  
`{"message": "Login successful", "role": "C"|"E", "access_token": "...", "refresh_token": "...", "token_type": "Bearer", "expires_in": <秒>}`  
（前端用 `role` 分支 UI；用 Bearer token 调用 API，或用 Cookie-only 模式亦可。）

---

### Refresh access token

**Method:** `POST /api/refresh`

**Body:**
```json
{"refresh_token": "<refresh_token from login>"}
```

**Success:** `200 OK` 返回新的 `access_token`、`refresh_token`、`expires_in`、`role`。

---

### Logout

**Method:** `POST /api/logout`

**Body:** None required.

---

## 2. Customer Management (HKR_CUSTOMER)

### Create Customer (Employee Only)

**Method:** `POST /api/customers`

**Body:**
```json
{"customer_id": 101, "first_name": "John", "last_name": "Doe", "street_address": "123 Main St", "city": "NYC", "state": "NY", "zip_code": "10001", "gender": "M", "marital_status": "S", "customer_type": "B"}
```

---

### Get Customer Details

**Method:** `GET /api/customers/<customer_id>`

---

### Update Customer Details

**Method:** `PUT /api/customers/<customer_id>`

**Body:**
```json
{"street_address": "456 New St", "city": "NYC", "state": "NY", "zip_code": "10002"}
```

---

## 3. Auto Insurance Entities

### Auto Policies (HKR_AUTO_POLICY)

**Create Policy (Employee Only):** `POST /api/auto_policies`

```json
{"auto_policy_id": 1, "start_date": "2023-01-01", "end_date": "2024-01-01", "premium_amount": 1200.50, "policy_status": "C", "customer_id": 101}
```

**Get Policy Details:** `GET /api/auto_policies/<policy_id>`

**Update Policy (Employee Only):** `PUT /api/auto_policies/<policy_id>`

```json
{"premium_amount": 1300.00, "policy_status": "C", "end_date": "2024-01-01"}
```

**Delete Policy (Employee Only):** `DELETE /api/auto_policies/<policy_id>`

---

### Auto Invoices (HKR_AUTO_INVOICE)

**Create Invoice (Employee Only):** `POST /api/auto_invoices`

```json
{"auto_invoice_id": 1, "invoice_date": "2023-01-15", "due_date": "2023-02-15", "invoice_amount": 100.00, "auto_policy_id": 1}
```

**Get Invoice Details:** `GET /api/auto_invoices/<invoice_id>`

**Update Invoice (Employee Only):** `PUT /api/auto_invoices/<invoice_id>`

```json
{"due_date": "2023-02-28", "invoice_amount": 100.00}
```

**Delete Invoice (Employee Only):** `DELETE /api/auto_invoices/<invoice_id>`

---

### Auto Payments (HKR_AUTO_PAYMENT)

**Create Payment:** `POST /api/auto_payments`

```json
{"auto_payment_id": 1, "payment_date": "2023-02-10", "payment_method": "Credit", "payment_amount": 100.00, "auto_invoice_id": 1}
```

**Notes:** `payment_method` must be `'PayPal'`, `'Credit'`, `'Debit'`, or `'Check'`.

**Get Payment Details:** `GET /api/auto_payments/<payment_id>`

**Update Payment (Employee Only):** `PUT /api/auto_payments/<payment_id>`

```json
{"payment_method": "Debit", "payment_amount": 100.00}
```

**Delete Payment (Employee Only):** `DELETE /api/auto_payments/<payment_id>`

---

## 4. Home Insurance Entities

### Home Policies (HKR_HOME_POLICY)

**Create Policy (Employee Only):** `POST /api/home_policies`

```json
{"home_policy_id": 1, "start_date": "2023-01-01", "end_date": "2024-01-01", "premium_amount": 950.00, "policy_status": "C", "customer_id": 101}
```

**Get Policy Details:** `GET /api/home_policies/<policy_id>`

**Update Policy (Employee Only):** `PUT /api/home_policies/<policy_id>`

```json
{"premium_amount": 1000.00, "policy_status": "C", "end_date": "2024-01-01"}
```

**Delete Policy (Employee Only):** `DELETE /api/home_policies/<policy_id>`

---

### Home Invoices (HKR_HOME_INVOICE)

**Create Invoice (Employee Only):** `POST /api/home_invoices`

```json
{"home_invoice_id": 1, "invoice_date": "2023-01-15", "due_date": "2023-02-15", "invoice_amount": 950.00, "home_policy_id": 1}
```

**Get Invoice Details:** `GET /api/home_invoices/<invoice_id>`

**Update Invoice (Employee Only):** `PUT /api/home_invoices/<invoice_id>`

```json
{"due_date": "2023-02-28", "invoice_amount": 950.00}
```

**Delete Invoice (Employee Only):** `DELETE /api/home_invoices/<invoice_id>`

---

### Home Payments (HKR_HOME_PAYMENT)

**Create Payment:** `POST /api/home_payments`

```json
{"home_payment_id": 1, "payment_date": "2023-02-10", "payment_method": "Credit", "payment_amount": 950.00, "home_invoice_id": 1}
```

**Get Payment Details:** `GET /api/home_payments/<payment_id>`

**Update Payment (Employee Only):** `PUT /api/home_payments/<payment_id>`

```json
{"payment_method": "Debit", "payment_amount": 950.00}
```

**Delete Payment (Employee Only):** `DELETE /api/home_payments/<payment_id>`

---

### Insured Homes (HKR_INSURED_HOME)

**Create Home (Employee Only):** `POST /api/insured_homes`

```json
{"home_id": 1, "purchase_date": "2015-06-01", "purchase_value": 350000.00, "area_sq_ft": 2500, "home_type": "S", "auto_fire_notification": "1", "home_security_system": "1", "swimming_pool": "O", "basement": "1", "home_policy_id": 1}
```

**Notes:** 
- `swimming_pool` can be omitted (`null`)
- `home_type` must be `C`, `M`, `S`, or `T`
- Boolean flags use `"0"` or `"1"`

**Get Home Details:** `GET /api/insured_homes/<home_id>`

**Update Home (Employee Only):** `PUT /api/insured_homes/<home_id>`

```json
{"purchase_value": 360000.00, "auto_fire_notification": "1", "home_security_system": "1", "swimming_pool": null, "basement": "1"}
```

**Delete Home (Employee Only):** `DELETE /api/insured_homes/<home_id>`

---

## 5. Vehicle and Driver Entities

### Insured Vehicles (HKR_INSURED_VEHICLE)

**Create Vehicle (Employee Only):** `POST /api/insured_vehicles`

```json
{"vehicle_id": 1, "vin": "1HGCM82633A000000", "make_model_year": "Honda Accord 2020", "vehicle_status": "O", "auto_policy_id": 1}
```

**Notes:** 
- `vin` must be exactly 17 characters
- `vehicle_status` must be `F` (Financed), `L` (Leased), or `O` (Owned)

**Get Vehicle Details:** `GET /api/insured_vehicles/<vehicle_id>`

**Update Vehicle (Employee Only):** `PUT /api/insured_vehicles/<vehicle_id>` (Requires backend code update from previous feedback)

```json
{"vehicle_status": "O"}
```

**Delete Vehicle (Employee Only):** `DELETE /api/insured_vehicles/<vehicle_id>`

---

### Drivers (HKR_DRIVER & HKR_DRIVER_VEHICLE)

**Create Driver (Employee Only):** `POST /api/drivers`

```json
{"driver_id": 1, "license_number": "D12345678", "first_name": "Jane", "last_name": "Doe", "age": 25}
```

**Get Driver Details:** `GET /api/drivers/<driver_id>`

**Update Driver (Employee Only):** `PUT /api/drivers/<driver_id>` (Requires backend code update from previous feedback)

```json
{"first_name": "Jane", "last_name": "Smith", "age": 26}
```

**Delete Driver (Employee Only):** `DELETE /api/drivers/<driver_id>` (Requires backend code update from previous feedback)

---

### Link Driver to Vehicle (Employee Only)

**Method:** `POST /api/driver_vehicle`

**Body:**
```json
{"driver_id": 1, "vehicle_id": 1}
```

**Notes:** Connects an existing driver to an existing vehicle.
