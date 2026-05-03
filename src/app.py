import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify, session, g
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from decimal import Decimal

# Load `.env` from project root (directory above `src/`)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import auth_tokens

app = Flask(__name__)

_flask_secret = os.environ.get("FLASK_SECRET_KEY") or os.environ.get("SECRET_KEY")
if not _flask_secret:
    raise RuntimeError(
        "FLASK_SECRET_KEY (or SECRET_KEY) must be set in the project root `.env` file."
    )
app.secret_key = _flask_secret

# Database configuration — see `.env` in project root (HKR_DB matches sql/ scripts)
db_config = {
    "host": os.environ.get("MYSQL_HOST", "localhost"),
    "port": int(os.environ.get("MYSQL_PORT", "3306")),
    "user": os.environ.get("MYSQL_USER", "root"),
    "password": os.environ.get("MYSQL_PASSWORD", ""),
    "database": os.environ.get("MYSQL_DATABASE", "HKR_DB"),
    "autocommit": False,
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None


def load_auth_context():
    """解析当前用户：优先 Authorization Bearer（JWT 访问令牌），否则回退 Flask session。"""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        payload = auth_tokens.decode_access_token(token)
        if payload:
            return {
                "user_id": int(payload["user_id"]),
                "role": payload["role"],
                "customer_id": payload.get("customer_id"),
            }
    if "user_id" in session:
        return {
            "user_id": session["user_id"],
            "role": session["role"],
            "customer_id": session.get("customer_id"),
        }
    return None


# --- Authorization Decorators ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        ctx = load_auth_context()
        if not ctx:
            return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        g.auth = ctx
        return f(*args, **kwargs)
    return decorated_function

def employee_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.auth.get('role') != 'E':
            return jsonify({'error': 'Forbidden. Employee access required.'}), 403
        return f(*args, **kwargs)
    return decorated_function

# --- Authentication Routes ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'C') # Default to Customer
    customer_id = data.get('customer_id') # Can be null if Employee

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    # 使用 pbkdf2:sha256：部分 macOS / 精简 Python 无 hashlib.scrypt，Werkzeug 默认 scrypt 会报 AttributeError
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error'}), 500

    try:
        # Using prepared=True to prevent SQL injection
        cursor = conn.cursor(prepared=True)
        # Transaction starts implicitly
        query = """INSERT INTO HKR_USER (Username, Password_Hash, Role, CUSTOMER_ID) 
                   VALUES (%s, %s, %s, %s)"""
        cursor.execute(query, (username, hashed_password, role, customer_id))
        conn.commit() # Commit transaction
        return jsonify({'message': 'User registered successfully'}), 201
    except Error as e:
        conn.rollback() # Rollback on error to prevent partial commits
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    
    try:
        query = "SELECT * FROM HKR_USER WHERE Username = %s"
        cursor.execute(query, (username,))
        user = cursor.fetchone()

        if user and check_password_hash(user['Password_Hash'], password):
            # 仍写入 session，兼容仅用 Cookie 的旧前端 / api_handoff 说明
            session['user_id'] = user['User_ID']
            session['role'] = user['Role']
            session['customer_id'] = user['CUSTOMER_ID']
            # 双 Token：供 React SPA 使用 Bearer，便于与客户端缓存/刷新策略配合（Part II 加分）
            uid, role = user['User_ID'], user['Role']
            cid = user['CUSTOMER_ID']
            if cid is not None:
                cid = int(cid)
            access = auth_tokens.create_access_token(
                user_id=int(uid), role=role, customer_id=cid
            )
            refresh = auth_tokens.create_refresh_token(user_id=int(uid))
            return jsonify({
                'message': 'Login successful',
                'role': role,
                'access_token': access,
                'refresh_token': refresh,
                'token_type': 'Bearer',
                'expires_in': auth_tokens.access_ttl_seconds(),
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    finally:
        cursor.close()
        conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200


@app.route('/api/refresh', methods=['POST'])
def refresh_access_token():
    """使用 refresh_token 换取新的 access_token（双 Token 流程）；无需 Cookie。"""
    data = request.json or {}
    refresh_tok = data.get('refresh_token')
    if not refresh_tok:
        return jsonify({'error': 'refresh_token required'}), 400
    payload = auth_tokens.decode_refresh_token(refresh_tok)
    if not payload:
        return jsonify({'error': 'Invalid or expired refresh token'}), 401
    user_id = int(payload['user_id'])
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error'}), 500
    cursor = conn.cursor(dictionary=True, prepared=True)
    try:
        cursor.execute(
            "SELECT User_ID, Role, CUSTOMER_ID FROM HKR_USER WHERE User_ID = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'User not found'}), 401
        rcid = row['CUSTOMER_ID']
        if rcid is not None:
            rcid = int(rcid)
        access = auth_tokens.create_access_token(
            user_id=int(row['User_ID']),
            role=row['Role'],
            customer_id=rcid,
        )
        new_refresh = auth_tokens.create_refresh_token(user_id=int(row['User_ID']))
        return jsonify({
            'access_token': access,
            'refresh_token': new_refresh,
            'token_type': 'Bearer',
            'expires_in': auth_tokens.access_ttl_seconds(),
            'role': row['Role'],
        }), 200
    finally:
        cursor.close()
        conn.close()

# --- CRUD Operations for HKR_CUSTOMER ---

@app.route('/api/customers', methods=['POST'])
@login_required
@employee_required # Example: Only employees can create new customer records
def create_customer():
    data = request.json or {}
    req = [
        'customer_id', 'first_name', 'last_name', 'street_address',
        'city', 'state', 'zip_code', 'marital_status', 'customer_type',
    ]
    missing = [k for k in req if data.get(k) in (None, '')]
    if missing:
        return jsonify({'error': 'Missing required fields.', 'fields': missing}), 400

    try:
        cid = int(data['customer_id'])
    except (TypeError, ValueError):
        return jsonify({'error': 'customer_id must be an integer.'}), 400
    if cid <= 0:
        return jsonify({'error': 'customer_id must be positive.'}), 400

    raw_g = data.get('gender')
    if raw_g is None or (isinstance(raw_g, str) and raw_g.strip() == ''):
        gender = None
    else:
        g = str(raw_g).strip().upper()
        if g not in ('M', 'F'):
            return jsonify({'error': 'Gender must be M, F, or omitted.'}), 400
        gender = g

    state = str(data['state']).strip().upper()
    if len(state) != 2:
        return jsonify({'error': 'State must be a 2-letter code (e.g. NY).'}), 400

    ctype = str(data['customer_type']).strip().upper()
    if ctype not in ('A', 'H', 'B'):
        return jsonify({'error': 'Customer type must be A, H, or B.'}), 400

    ms = str(data['marital_status']).strip().upper()
    if ms not in ('M', 'S', 'W'):
        return jsonify({'error': 'Marital status must be M, S, or W.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error'}), 500
    cursor = conn.cursor(prepared=True)

    try:
        query = """INSERT INTO HKR_CUSTOMER 
                   (CUSTOMER_ID, First_Name, Last_Name, Street_Address, City, State, Zip_Code, Gender, Marital_Status, Customer_Type) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        values = (
            cid,
            str(data['first_name']).strip(),
            str(data['last_name']).strip(),
            str(data['street_address']).strip(),
            str(data['city']).strip(),
            state,
            str(data['zip_code']).strip(),
            gender,
            ms,
            ctype,
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Customer created successfully'}), 201
    except Error as e:
        conn.rollback()
        err_msg = str(e)
        if 'Duplicate entry' in err_msg or '1062' in err_msg:
            return jsonify({'error': 'Customer ID already exists. Choose another ID.'}), 400
        return jsonify({'error': err_msg}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
@login_required
def get_customer(customer_id):
    # Authorization check: Customers can only view their own data 
    if g.auth.get('role') == 'C' and g.auth.get('customer_id') != customer_id:
        return jsonify({'error': 'Forbidden. Cannot access other customer data.'}), 403

    conn = get_db_connection()
    # dictionary=True makes JSON serialization easier, but requires standard cursor in mysql-connector
    # For SELECTs where we control the type via route (<int:customer_id>), standard is safe, 
    # but we will stick to parameterized to be strict.
    cursor = conn.cursor(dictionary=True) 
    
    try:
        query = "SELECT * FROM HKR_CUSTOMER WHERE CUSTOMER_ID = %s"
        cursor.execute(query, (customer_id,))
        customer = cursor.fetchone()
        
        if customer:
            return jsonify(customer), 200
        return jsonify({'error': 'Customer not found'}), 404
    finally:
        cursor.close()
        conn.close()

@app.route('/api/customers/<int:customer_id>', methods=['PUT'])
@login_required
def update_customer(customer_id):
    if g.auth.get('role') == 'C' and g.auth.get('customer_id') != customer_id:
        return jsonify({'error': 'Forbidden.'}), 403

    data = request.json or {}
    required = ('street_address', 'city', 'state', 'zip_code')
    missing = [k for k in required if data.get(k) in (None, '')]
    if missing:
        return jsonify({'error': 'Missing required fields.', 'fields': missing}), 400

    state = str(data['state']).strip().upper()
    if len(state) != 2:
        return jsonify({'error': 'State must be a 2-letter code (e.g. NY).'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error'}), 500
    cursor = conn.cursor(prepared=True)

    try:
        cursor.execute(
            "SELECT CUSTOMER_ID FROM HKR_CUSTOMER WHERE CUSTOMER_ID = %s",
            (customer_id,),
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Customer not found'}), 404

        query = """UPDATE HKR_CUSTOMER 
                   SET Street_Address = %s, City = %s, State = %s, Zip_Code = %s 
                   WHERE CUSTOMER_ID = %s"""
        values = (
            str(data['street_address']).strip(),
            str(data['city']).strip(),
            state,
            str(data['zip_code']).strip(),
            customer_id,
        )
        cursor.execute(query, values)
        conn.commit()
        # MySQL “0 rows affected” when values unchanged — still success if row exists (checked above).
        return jsonify({'message': 'Customer updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


def _json_clean_row(row):
    """将 Decimal 等类型转为 JSON 友好值（列表接口与 stats 一致）。"""
    if row is None:
        return None
    d = dict(row)
    for k, v in list(d.items()):
        if isinstance(v, Decimal):
            d[k] = float(v)
    return d


def _json_clean_rows(rows):
    return [_json_clean_row(r) for r in rows]


@app.route("/api/me/records/<kind>", methods=["GET"])
@login_required
def list_my_records(kind):
    """当前登录客户（role=C）分页列出本人名下的保单、账单、标的、驾驶员等摘要行。"""
    if g.auth.get("role") != "C":
        return jsonify({"error": "Forbidden. Customer access only."}), 403
    raw_cid = g.auth.get("customer_id")
    if raw_cid is None:
        return jsonify({"error": "Account has no linked customer record."}), 403
    customer_id = int(raw_cid)

    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=10, type=int)
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 10
    if per_page > 50:
        per_page = 50
    offset = (page - 1) * per_page

    specs = {
        "auto_policy": (
            "SELECT COUNT(*) AS c FROM HKR_AUTO_POLICY WHERE CUSTOMER_ID = %s",
            "SELECT * FROM HKR_AUTO_POLICY WHERE CUSTOMER_ID = %s ORDER BY Auto_Policy_ID LIMIT %s OFFSET %s",
            (customer_id, per_page, offset),
        ),
        "home_policy": (
            "SELECT COUNT(*) AS c FROM HKR_HOME_POLICY WHERE CUSTOMER_ID = %s",
            "SELECT * FROM HKR_HOME_POLICY WHERE CUSTOMER_ID = %s ORDER BY Home_Policy_ID LIMIT %s OFFSET %s",
            (customer_id, per_page, offset),
        ),
        "auto_invoice": (
            """SELECT COUNT(*) AS c FROM HKR_AUTO_INVOICE i
               JOIN HKR_AUTO_POLICY p ON i.Auto_Policy_ID = p.Auto_Policy_ID
               WHERE p.CUSTOMER_ID = %s""",
            """SELECT i.* FROM HKR_AUTO_INVOICE i
               JOIN HKR_AUTO_POLICY p ON i.Auto_Policy_ID = p.Auto_Policy_ID
               WHERE p.CUSTOMER_ID = %s ORDER BY i.Auto_Invoice_ID LIMIT %s OFFSET %s""",
            (customer_id, per_page, offset),
        ),
        "home_invoice": (
            """SELECT COUNT(*) AS c FROM HKR_HOME_INVOICE i
               JOIN HKR_HOME_POLICY p ON i.Home_Policy_ID = p.Home_Policy_ID
               WHERE p.CUSTOMER_ID = %s""",
            """SELECT i.* FROM HKR_HOME_INVOICE i
               JOIN HKR_HOME_POLICY p ON i.Home_Policy_ID = p.Home_Policy_ID
               WHERE p.CUSTOMER_ID = %s ORDER BY i.Home_Invoice_ID LIMIT %s OFFSET %s""",
            (customer_id, per_page, offset),
        ),
        "auto_payment": (
            """SELECT COUNT(*) AS c FROM HKR_AUTO_PAYMENT pay
               JOIN HKR_AUTO_INVOICE i ON pay.Auto_Invoice_ID = i.Auto_Invoice_ID
               JOIN HKR_AUTO_POLICY p ON i.Auto_Policy_ID = p.Auto_Policy_ID
               WHERE p.CUSTOMER_ID = %s""",
            """SELECT pay.* FROM HKR_AUTO_PAYMENT pay
               JOIN HKR_AUTO_INVOICE i ON pay.Auto_Invoice_ID = i.Auto_Invoice_ID
               JOIN HKR_AUTO_POLICY p ON i.Auto_Policy_ID = p.Auto_Policy_ID
               WHERE p.CUSTOMER_ID = %s ORDER BY pay.Auto_Payment_ID LIMIT %s OFFSET %s""",
            (customer_id, per_page, offset),
        ),
        "home_payment": (
            """SELECT COUNT(*) AS c FROM HKR_HOME_PAYMENT pay
               JOIN HKR_HOME_INVOICE i ON pay.Home_Invoice_ID = i.Home_Invoice_ID
               JOIN HKR_HOME_POLICY p ON i.Home_Policy_ID = p.Home_Policy_ID
               WHERE p.CUSTOMER_ID = %s""",
            """SELECT pay.* FROM HKR_HOME_PAYMENT pay
               JOIN HKR_HOME_INVOICE i ON pay.Home_Invoice_ID = i.Home_Invoice_ID
               JOIN HKR_HOME_POLICY p ON i.Home_Policy_ID = p.Home_Policy_ID
               WHERE p.CUSTOMER_ID = %s ORDER BY pay.Home_Payment_ID LIMIT %s OFFSET %s""",
            (customer_id, per_page, offset),
        ),
        "insured_home": (
            """SELECT COUNT(*) AS c FROM HKR_INSURED_HOME h
               JOIN HKR_HOME_POLICY p ON h.Home_Policy_ID = p.Home_Policy_ID
               WHERE p.CUSTOMER_ID = %s""",
            """SELECT h.* FROM HKR_INSURED_HOME h
               JOIN HKR_HOME_POLICY p ON h.Home_Policy_ID = p.Home_Policy_ID
               WHERE p.CUSTOMER_ID = %s ORDER BY h.Home_ID LIMIT %s OFFSET %s""",
            (customer_id, per_page, offset),
        ),
        "insured_vehicle": (
            """SELECT COUNT(*) AS c FROM HKR_INSURED_VEHICLE v
               JOIN HKR_AUTO_POLICY p ON v.Auto_Policy_ID = p.Auto_Policy_ID
               WHERE p.CUSTOMER_ID = %s""",
            """SELECT v.* FROM HKR_INSURED_VEHICLE v
               JOIN HKR_AUTO_POLICY p ON v.Auto_Policy_ID = p.Auto_Policy_ID
               WHERE p.CUSTOMER_ID = %s ORDER BY v.Vehicle_ID LIMIT %s OFFSET %s""",
            (customer_id, per_page, offset),
        ),
        "driver": (
            """SELECT COUNT(DISTINCT d.Driver_ID) AS c FROM HKR_DRIVER d
               JOIN HKR_DRIVER_VEHICLE dv ON d.Driver_ID = dv.Driver_ID
               JOIN HKR_INSURED_VEHICLE v ON dv.Vehicle_ID = v.Vehicle_ID
               JOIN HKR_AUTO_POLICY p ON v.Auto_Policy_ID = p.Auto_Policy_ID
               WHERE p.CUSTOMER_ID = %s""",
            """SELECT DISTINCT d.Driver_ID, d.License_Number, d.First_Name, d.Last_Name, d.Age
               FROM HKR_DRIVER d
               JOIN HKR_DRIVER_VEHICLE dv ON d.Driver_ID = dv.Driver_ID
               JOIN HKR_INSURED_VEHICLE v ON dv.Vehicle_ID = v.Vehicle_ID
               JOIN HKR_AUTO_POLICY p ON v.Auto_Policy_ID = p.Auto_Policy_ID
               WHERE p.CUSTOMER_ID = %s
               ORDER BY d.Driver_ID LIMIT %s OFFSET %s""",
            (customer_id, per_page, offset),
        ),
    }
    if kind not in specs:
        return jsonify({"error": "Unknown record kind.", "valid": list(specs.keys())}), 400

    count_sql, select_sql, select_params = specs[kind]
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database error"}), 500
    cursor = conn.cursor(dictionary=True, prepared=True)
    try:
        cursor.execute(count_sql, (customer_id,))
        total_row = cursor.fetchone()
        total = int(total_row["c"]) if total_row and total_row.get("c") is not None else 0

        cursor.execute(select_sql, select_params)
        items = cursor.fetchall()
        return (
            jsonify(
                {
                    "items": _json_clean_rows(items),
                    "total": total,
                    "page": page,
                    "per_page": per_page,
                }
            ),
            200,
        )
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# --- CRUD Operations for HKR_AUTO_POLICY ---

@app.route('/api/auto_policies', methods=['POST'])
@login_required
@employee_required # Assuming only employees create policies
def create_auto_policy():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Verify the Customer exists before creating a policy
        cursor.execute("SELECT CUSTOMER_ID FROM HKR_CUSTOMER WHERE CUSTOMER_ID = %s", (data['customer_id'],))
        if not cursor.fetchone():
            return jsonify({'error': 'Customer ID does not exist.'}), 400

        query = """INSERT INTO HKR_AUTO_POLICY 
                   (Auto_Policy_ID, Start_Date, End_Date, Premium_Amount, Policy_Status, CUSTOMER_ID) 
                   VALUES (%s, %s, %s, %s, %s, %s)"""
        values = (
            data['auto_policy_id'], data['start_date'], data['end_date'], 
            data['premium_amount'], data['policy_status'], data['customer_id']
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Auto Policy created successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auto_policies/<int:policy_id>', methods=['GET'])
@login_required
def get_auto_policy(policy_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    
    try:
        query = "SELECT * FROM HKR_AUTO_POLICY WHERE Auto_Policy_ID = %s"
        cursor.execute(query, (policy_id,))
        policy = cursor.fetchone()
        
        if not policy:
            return jsonify({'error': 'Policy not found'}), 404

        # Authorization: Customers can only view their own policies
        if g.auth.get('role') == 'C' and g.auth.get('customer_id') != policy['CUSTOMER_ID']:
            return jsonify({'error': 'Forbidden. This policy belongs to another customer.'}), 403
            
        return jsonify(policy), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auto_policies/<int:policy_id>', methods=['PUT'])
@login_required
@employee_required # Assuming only employees can update policy details
def update_auto_policy(policy_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = """UPDATE HKR_AUTO_POLICY 
                   SET Premium_Amount = %s, Policy_Status = %s, End_Date = %s
                   WHERE Auto_Policy_ID = %s"""
        values = (data['premium_amount'], data['policy_status'], data['end_date'], policy_id)
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Policy not found or no changes made'}), 404
            
        return jsonify({'message': 'Auto Policy updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auto_policies/<int:policy_id>', methods=['DELETE'])
@login_required
@employee_required # Deletion should be strictly restricted
def delete_auto_policy(policy_id):
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = "DELETE FROM HKR_AUTO_POLICY WHERE Auto_Policy_ID = %s"
        cursor.execute(query, (policy_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Policy not found'}), 404
            
        return jsonify({'message': 'Auto Policy deleted successfully'}), 200
    except Error as e:
        conn.rollback()
        # Handle foreign key constraint failures gracefully
        return jsonify({'error': 'Cannot delete policy. Dependent records exist.', 'details': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# --- CRUD Operations for HKR_AUTO_INVOICE ---

@app.route('/api/auto_invoices', methods=['POST'])
@login_required
@employee_required # Assuming only employees/system generate invoices
def create_auto_invoice():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Business Logic: Verify the Auto Policy exists
        cursor.execute("SELECT Auto_Policy_ID FROM HKR_AUTO_POLICY WHERE Auto_Policy_ID = %s", (data['auto_policy_id'],))
        if not cursor.fetchone():
            return jsonify({'error': 'Auto Policy ID does not exist.'}), 400

        query = """INSERT INTO HKR_AUTO_INVOICE 
                   (Auto_Invoice_ID, Invoice_Date, Due_Date, Invoice_Amount, Auto_Policy_ID) 
                   VALUES (%s, %s, %s, %s, %s)"""
        values = (
            data['auto_invoice_id'], data['invoice_date'], data['due_date'], 
            data['invoice_amount'], data['auto_policy_id']
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Auto Invoice created successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auto_invoices/<int:invoice_id>', methods=['GET'])
@login_required
def get_auto_invoice(invoice_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    
    try:
        # Join with policy to check customer authorization
        query = """SELECT i.*, p.CUSTOMER_ID 
                   FROM HKR_AUTO_INVOICE i
                   JOIN HKR_AUTO_POLICY p ON i.Auto_Policy_ID = p.Auto_Policy_ID
                   WHERE i.Auto_Invoice_ID = %s"""
        cursor.execute(query, (invoice_id,))
        invoice = cursor.fetchone()
        
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404

        # Authorization: Customers can only view invoices linked to their own policies
        if g.auth.get('role') == 'C' and g.auth.get('customer_id') != invoice['CUSTOMER_ID']:
            return jsonify({'error': 'Forbidden. This invoice belongs to another customer.'}), 403
            
        # Remove the joined CUSTOMER_ID from the response for cleaner output
        del invoice['CUSTOMER_ID']
        return jsonify(invoice), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auto_invoices/<int:invoice_id>', methods=['PUT'])
@login_required
@employee_required
def update_auto_invoice(invoice_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = """UPDATE HKR_AUTO_INVOICE 
                   SET Due_Date = %s, Invoice_Amount = %s
                   WHERE Auto_Invoice_ID = %s"""
        values = (data['due_date'], data['invoice_amount'], invoice_id)
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Invoice not found or no changes made'}), 404
            
        return jsonify({'message': 'Auto Invoice updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auto_invoices/<int:invoice_id>', methods=['DELETE'])
@login_required
@employee_required
def delete_auto_invoice(invoice_id):
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = "DELETE FROM HKR_AUTO_INVOICE WHERE Auto_Invoice_ID = %s"
        cursor.execute(query, (invoice_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Invoice not found'}), 404
            
        return jsonify({'message': 'Auto Invoice deleted successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': 'Cannot delete invoice. Dependent records (payments) may exist.', 'details': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


# --- CRUD Operations for HKR_AUTO_PAYMENT ---

@app.route('/api/auto_payments', methods=['POST'])
@login_required
def create_auto_payment():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Verify the Auto Invoice exists
        cursor.execute("SELECT Auto_Invoice_ID FROM HKR_AUTO_INVOICE WHERE Auto_Invoice_ID = %s", (data['auto_invoice_id'],))
        if not cursor.fetchone():
            return jsonify({'error': 'Auto Invoice ID does not exist.'}), 400

        query = """INSERT INTO HKR_AUTO_PAYMENT 
                   (Auto_Payment_ID, Payment_Date, Payment_Method, Payment_Amount, Auto_Invoice_ID) 
                   VALUES (%s, %s, %s, %s, %s)"""
        values = (
            data['auto_payment_id'], data['payment_date'], data['payment_method'], 
            data['payment_amount'], data['auto_invoice_id']
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Auto Payment recorded successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auto_payments/<int:payment_id>', methods=['GET'])
@login_required
def get_auto_payment(payment_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    
    try:
        # Deep join to verify customer authorization (Payment -> Invoice -> Policy -> Customer)
        query = """SELECT pay.*, p.CUSTOMER_ID 
                   FROM HKR_AUTO_PAYMENT pay
                   JOIN HKR_AUTO_INVOICE i ON pay.Auto_Invoice_ID = i.Auto_Invoice_ID
                   JOIN HKR_AUTO_POLICY p ON i.Auto_Policy_ID = p.Auto_Policy_ID
                   WHERE pay.Auto_Payment_ID = %s"""
        cursor.execute(query, (payment_id,))
        payment = cursor.fetchone()
        
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404

        if g.auth.get('role') == 'C' and g.auth.get('customer_id') != payment['CUSTOMER_ID']:
            return jsonify({'error': 'Forbidden. Cannot view another customer\'s payment.'}), 403
            
        del payment['CUSTOMER_ID']
        return jsonify(payment), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auto_payments/<int:payment_id>', methods=['PUT'])
@login_required
@employee_required # Usually, customers shouldn't modify a payment once recorded
def update_auto_payment(payment_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = """UPDATE HKR_AUTO_PAYMENT 
                   SET Payment_Method = %s, Payment_Amount = %s 
                   WHERE Auto_Payment_ID = %s"""
        values = (data['payment_method'], data['payment_amount'], payment_id)
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Payment not found or no changes made'}), 404
            
        return jsonify({'message': 'Auto Payment updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auto_payments/<int:payment_id>', methods=['DELETE'])
@login_required
@employee_required
def delete_auto_payment(payment_id):
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = "DELETE FROM HKR_AUTO_PAYMENT WHERE Auto_Payment_ID = %s"
        cursor.execute(query, (payment_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Payment not found'}), 404
            
        return jsonify({'message': 'Auto Payment deleted successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# --- CRUD Operations for HKR_HOME_POLICY ---

@app.route('/api/home_policies', methods=['POST'])
@login_required
@employee_required
def create_home_policy():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Verify Customer exists
        cursor.execute("SELECT CUSTOMER_ID FROM HKR_CUSTOMER WHERE CUSTOMER_ID = %s", (data['customer_id'],))
        if not cursor.fetchone():
            return jsonify({'error': 'Customer ID does not exist.'}), 400

        query = """INSERT INTO HKR_HOME_POLICY 
                   (Home_Policy_ID, Start_Date, End_Date, Premium_Amount, Policy_Status, CUSTOMER_ID) 
                   VALUES (%s, %s, %s, %s, %s, %s)"""
        values = (
            data['home_policy_id'], data['start_date'], data['end_date'], 
            data['premium_amount'], data['policy_status'], data['customer_id']
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Home Policy created successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/home_policies/<int:policy_id>', methods=['GET'])
@login_required
def get_home_policy(policy_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    
    try:
        query = "SELECT * FROM HKR_HOME_POLICY WHERE Home_Policy_ID = %s"
        cursor.execute(query, (policy_id,))
        policy = cursor.fetchone()
        
        if not policy:
            return jsonify({'error': 'Home Policy not found'}), 404

        if g.auth.get('role') == 'C' and g.auth.get('customer_id') != policy['CUSTOMER_ID']:
            return jsonify({'error': 'Forbidden. This policy belongs to another customer.'}), 403
            
        return jsonify(policy), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/home_policies/<int:policy_id>', methods=['PUT'])
@login_required
@employee_required
def update_home_policy(policy_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = """UPDATE HKR_HOME_POLICY 
                   SET Premium_Amount = %s, Policy_Status = %s, End_Date = %s
                   WHERE Home_Policy_ID = %s"""
        values = (data['premium_amount'], data['policy_status'], data['end_date'], policy_id)
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Home Policy not found or no changes made'}), 404
            
        return jsonify({'message': 'Home Policy updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/home_policies/<int:policy_id>', methods=['DELETE'])
@login_required
@employee_required
def delete_home_policy(policy_id):
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = "DELETE FROM HKR_HOME_POLICY WHERE Home_Policy_ID = %s"
        cursor.execute(query, (policy_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Home Policy not found'}), 404
            
        return jsonify({'message': 'Home Policy deleted successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': 'Cannot delete policy. Dependent records exist.', 'details': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# --- CRUD Operations for HKR_HOME_INVOICE ---

@app.route('/api/home_invoices', methods=['POST'])
@login_required
@employee_required
def create_home_invoice():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Verify Home Policy exists
        cursor.execute("SELECT Home_Policy_ID FROM HKR_HOME_POLICY WHERE Home_Policy_ID = %s", (data['home_policy_id'],))
        if not cursor.fetchone():
            return jsonify({'error': 'Home Policy ID does not exist.'}), 400

        query = """INSERT INTO HKR_HOME_INVOICE 
                   (Home_Invoice_ID, Invoice_Date, Due_Date, Invoice_Amount, Home_Policy_ID) 
                   VALUES (%s, %s, %s, %s, %s)"""
        values = (
            data['home_invoice_id'], data['invoice_date'], data['due_date'], 
            data['invoice_amount'], data['home_policy_id']
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Home Invoice created successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/home_invoices/<int:invoice_id>', methods=['GET'])
@login_required
def get_home_invoice(invoice_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    
    try:
        query = """SELECT i.*, p.CUSTOMER_ID 
                   FROM HKR_HOME_INVOICE i
                   JOIN HKR_HOME_POLICY p ON i.Home_Policy_ID = p.Home_Policy_ID
                   WHERE i.Home_Invoice_ID = %s"""
        cursor.execute(query, (invoice_id,))
        invoice = cursor.fetchone()
        
        if not invoice:
            return jsonify({'error': 'Home Invoice not found'}), 404

        if g.auth.get('role') == 'C' and g.auth.get('customer_id') != invoice['CUSTOMER_ID']:
            return jsonify({'error': 'Forbidden. This invoice belongs to another customer.'}), 403
            
        del invoice['CUSTOMER_ID']
        return jsonify(invoice), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/home_invoices/<int:invoice_id>', methods=['PUT'])
@login_required
@employee_required
def update_home_invoice(invoice_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = """UPDATE HKR_HOME_INVOICE 
                   SET Due_Date = %s, Invoice_Amount = %s
                   WHERE Home_Invoice_ID = %s"""
        values = (data['due_date'], data['invoice_amount'], invoice_id)
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Home Invoice not found or no changes made'}), 404
            
        return jsonify({'message': 'Home Invoice updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/home_invoices/<int:invoice_id>', methods=['DELETE'])
@login_required
@employee_required
def delete_home_invoice(invoice_id):
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = "DELETE FROM HKR_HOME_INVOICE WHERE Home_Invoice_ID = %s"
        cursor.execute(query, (invoice_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Home Invoice not found'}), 404
            
        return jsonify({'message': 'Home Invoice deleted successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': 'Cannot delete invoice. Dependent records exist.', 'details': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# --- CRUD Operations for HKR_HOME_PAYMENT ---

@app.route('/api/home_payments', methods=['POST'])
@login_required
def create_home_payment():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Verify Home Invoice exists
        cursor.execute("SELECT Home_Invoice_ID FROM HKR_HOME_INVOICE WHERE Home_Invoice_ID = %s", (data['home_invoice_id'],))
        if not cursor.fetchone():
            return jsonify({'error': 'Home Invoice ID does not exist.'}), 400

        query = """INSERT INTO HKR_HOME_PAYMENT 
                   (Home_Payment_ID, Payment_Date, Payment_Method, Payment_Amount, Home_Invoice_ID) 
                   VALUES (%s, %s, %s, %s, %s)"""
        values = (
            data['home_payment_id'], data['payment_date'], data['payment_method'], 
            data['payment_amount'], data['home_invoice_id']
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Home Payment recorded successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/home_payments/<int:payment_id>', methods=['GET'])
@login_required
def get_home_payment(payment_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    
    try:
        query = """SELECT pay.*, p.CUSTOMER_ID 
                   FROM HKR_HOME_PAYMENT pay
                   JOIN HKR_HOME_INVOICE i ON pay.Home_Invoice_ID = i.Home_Invoice_ID
                   JOIN HKR_HOME_POLICY p ON i.Home_Policy_ID = p.Home_Policy_ID
                   WHERE pay.Home_Payment_ID = %s"""
        cursor.execute(query, (payment_id,))
        payment = cursor.fetchone()
        
        if not payment:
            return jsonify({'error': 'Home Payment not found'}), 404

        if g.auth.get('role') == 'C' and g.auth.get('customer_id') != payment['CUSTOMER_ID']:
            return jsonify({'error': 'Forbidden. Cannot view another customer\'s payment.'}), 403
            
        del payment['CUSTOMER_ID']
        return jsonify(payment), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/home_payments/<int:payment_id>', methods=['PUT'])
@login_required
@employee_required
def update_home_payment(payment_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = """UPDATE HKR_HOME_PAYMENT 
                   SET Payment_Method = %s, Payment_Amount = %s 
                   WHERE Home_Payment_ID = %s"""
        values = (data['payment_method'], data['payment_amount'], payment_id)
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Home Payment not found or no changes made'}), 404
            
        return jsonify({'message': 'Home Payment updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/home_payments/<int:payment_id>', methods=['DELETE'])
@login_required
@employee_required
def delete_home_payment(payment_id):
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = "DELETE FROM HKR_HOME_PAYMENT WHERE Home_Payment_ID = %s"
        cursor.execute(query, (payment_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Home Payment not found'}), 404
            
        return jsonify({'message': 'Home Payment deleted successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# --- CRUD Operations for HKR_INSURED_HOME ---

@app.route('/api/insured_homes', methods=['POST'])
@login_required
@employee_required
def create_insured_home():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Verify Home Policy exists
        cursor.execute("SELECT Home_Policy_ID FROM HKR_HOME_POLICY WHERE Home_Policy_ID = %s", (data['home_policy_id'],))
        if not cursor.fetchone():
            return jsonify({'error': 'Home Policy ID does not exist.'}), 400

        query = """INSERT INTO HKR_INSURED_HOME 
                   (Home_ID, Purchase_Date, Purchase_Value, Area_Sq_Ft, Home_Type, 
                    Auto_Fire_Notification, Home_Security_System, Swimming_Pool, Basement, Home_Policy_ID) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        values = (
            data['home_id'], data['purchase_date'], data['purchase_value'], data['area_sq_ft'], 
            data['home_type'], data['auto_fire_notification'], data['home_security_system'], 
            data.get('swimming_pool'), data['basement'], data['home_policy_id']
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Insured Home recorded successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/insured_homes/<int:home_id>', methods=['GET'])
@login_required
def get_insured_home(home_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    
    try:
        query = """SELECT h.*, p.CUSTOMER_ID 
                   FROM HKR_INSURED_HOME h
                   JOIN HKR_HOME_POLICY p ON h.Home_Policy_ID = p.Home_Policy_ID
                   WHERE h.Home_ID = %s"""
        cursor.execute(query, (home_id,))
        home = cursor.fetchone()
        
        if not home:
            return jsonify({'error': 'Insured Home not found'}), 404

        if g.auth.get('role') == 'C' and g.auth.get('customer_id') != home['CUSTOMER_ID']:
            return jsonify({'error': 'Forbidden. Cannot view another customer\'s home.'}), 403
            
        del home['CUSTOMER_ID']
        return jsonify(home), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/insured_homes/<int:home_id>', methods=['PUT'])
@login_required
@employee_required
def update_insured_home(home_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = """UPDATE HKR_INSURED_HOME 
                   SET Purchase_Value = %s, Auto_Fire_Notification = %s, 
                       Home_Security_System = %s, Swimming_Pool = %s, Basement = %s
                   WHERE Home_ID = %s"""
        values = (
            data['purchase_value'], data['auto_fire_notification'], 
            data['home_security_system'], data.get('swimming_pool'), 
            data['basement'], home_id
        )
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Insured Home not found or no changes made'}), 404
            
        return jsonify({'message': 'Insured Home updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/insured_homes/<int:home_id>', methods=['DELETE'])
@login_required
@employee_required
def delete_insured_home(home_id):
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = "DELETE FROM HKR_INSURED_HOME WHERE Home_ID = %s"
        cursor.execute(query, (home_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Insured Home not found'}), 404
            
        return jsonify({'message': 'Insured Home deleted successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


# --- CRUD Operations for HKR_INSURED_VEHICLE ---

@app.route('/api/insured_vehicles', methods=['POST'])
@login_required
@employee_required
def create_insured_vehicle():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Verify Auto Policy exists
        cursor.execute("SELECT Auto_Policy_ID FROM HKR_AUTO_POLICY WHERE Auto_Policy_ID = %s", (data['auto_policy_id'],))
        if not cursor.fetchone():
            return jsonify({'error': 'Auto Policy ID does not exist.'}), 400

        query = """INSERT INTO HKR_INSURED_VEHICLE 
                   (Vehicle_ID, VIN, Make_Model_Year, Vehicle_Status, Auto_Policy_ID) 
                   VALUES (%s, %s, %s, %s, %s)"""
        values = (
            data['vehicle_id'], data['vin'], data['make_model_year'], 
            data['vehicle_status'], data['auto_policy_id']
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Insured Vehicle recorded successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/insured_vehicles/<int:vehicle_id>', methods=['GET'])
@login_required
def get_insured_vehicle(vehicle_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    
    try:
        query = """SELECT v.*, p.CUSTOMER_ID 
                   FROM HKR_INSURED_VEHICLE v
                   JOIN HKR_AUTO_POLICY p ON v.Auto_Policy_ID = p.Auto_Policy_ID
                   WHERE v.Vehicle_ID = %s"""
        cursor.execute(query, (vehicle_id,))
        vehicle = cursor.fetchone()
        
        if not vehicle:
            return jsonify({'error': 'Insured Vehicle not found'}), 404

        if g.auth.get('role') == 'C' and g.auth.get('customer_id') != vehicle['CUSTOMER_ID']:
            return jsonify({'error': 'Forbidden. Cannot view another customer\'s vehicle.'}), 403
            
        del vehicle['CUSTOMER_ID']
        return jsonify(vehicle), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/insured_vehicles/<int:vehicle_id>', methods=['PUT'])
@login_required
@employee_required
def update_insured_vehicle(vehicle_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    try:
        query = """UPDATE HKR_INSURED_VEHICLE 
                   SET Vehicle_Status = %s
                   WHERE Vehicle_ID = %s"""
        cursor.execute(query, (data['vehicle_status'], vehicle_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Vehicle not found or no changes made'}), 404
        return jsonify({'message': 'Vehicle updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/insured_vehicles/<int:vehicle_id>', methods=['DELETE'])
@login_required
@employee_required
def delete_insured_vehicle(vehicle_id):
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    try:
        query = "DELETE FROM HKR_INSURED_VEHICLE WHERE Vehicle_ID = %s"
        cursor.execute(query, (vehicle_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Vehicle not found'}), 404
        return jsonify({'message': 'Vehicle deleted successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': 'Cannot delete vehicle. Dependent driver records may exist.', 'details': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


# --- CRUD Operations for HKR_DRIVER ---

@app.route('/api/drivers', methods=['POST'])
@login_required
@employee_required
def create_driver():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = """INSERT INTO HKR_DRIVER 
                   (Driver_ID, License_Number, First_Name, Last_Name, Age) 
                   VALUES (%s, %s, %s, %s, %s)"""
        values = (data['driver_id'], data['license_number'], data['first_name'], data['last_name'], data['age'])
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Driver created successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/drivers/<int:driver_id>', methods=['GET'])
@login_required
def get_driver(driver_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, prepared=True)
    try:
        query = "SELECT * FROM HKR_DRIVER WHERE Driver_ID = %s"
        cursor.execute(query, (driver_id,))
        driver = cursor.fetchone()
        
        if not driver:
            return jsonify({'error': 'Driver not found'}), 404        
        return jsonify(driver), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/drivers/<int:driver_id>', methods=['PUT'])
@login_required
@employee_required
def update_driver(driver_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    try:
        query = """UPDATE HKR_DRIVER 
                   SET First_Name = %s, Last_Name = %s, Age = %s
                   WHERE Driver_ID = %s"""
        cursor.execute(query, (data['first_name'], data['last_name'], data['age'], driver_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Driver not found or no changes made'}), 404
        return jsonify({'message': 'Driver updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/drivers/<int:driver_id>', methods=['DELETE'])
@login_required
@employee_required
def delete_driver(driver_id):
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    try:
        query = "DELETE FROM HKR_DRIVER WHERE Driver_ID = %s"
        cursor.execute(query, (driver_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Driver not found'}), 404
        return jsonify({'message': 'Driver deleted successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': 'Cannot delete driver. Linked to a vehicle.', 'details': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# --- Endpoint to Link Driver and Vehicle (HKR_DRIVER_VEHICLE) ---
@app.route('/api/driver_vehicle', methods=['POST'])
@login_required
@employee_required
def link_driver_to_vehicle():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        query = "INSERT INTO HKR_DRIVER_VEHICLE (Driver_ID, Vehicle_ID) VALUES (%s, %s)"
        cursor.execute(query, (data['driver_id'], data['vehicle_id']))
        conn.commit()
        return jsonify({'message': 'Driver linked to Vehicle successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/stats/overview', methods=['GET'])
@login_required
@employee_required
def stats_overview():
    # 中文：仪表盘聚合数据，供前端 Recharts 等组件做数据可视化（Part II 加分项）
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM HKR_AUTO_POLICY) AS auto_policy_count,
                (SELECT COALESCE(SUM(Premium_Amount), 0) FROM HKR_AUTO_POLICY) AS auto_premium_total,
                (SELECT COUNT(*) FROM HKR_HOME_POLICY) AS home_policy_count,
                (SELECT COALESCE(SUM(Premium_Amount), 0) FROM HKR_HOME_POLICY) AS home_premium_total,
                (SELECT COUNT(*) FROM HKR_CUSTOMER) AS customer_count
            """
        )
        row = cursor.fetchone()
        if row:
            for k, v in list(row.items()):
                if isinstance(v, Decimal):
                    row[k] = float(v)
        return jsonify(row), 200
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    app.run(debug=True)