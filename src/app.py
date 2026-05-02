from flask import Flask, request, jsonify, session
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
# In a real app, should keep this secret and load from environment variables
app.secret_key = 'super_secret_key_for_sessions'

# Database configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '021108',
    'database': 'project1',
    'autocommit': False # Manual commits for transaction control
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# --- Authorization Decorators ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function

def employee_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') != 'E':
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

    # Encrypt password before storing 
    hashed_password = generate_password_hash(password)

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
            # Set session variables
            session['user_id'] = user['User_ID']
            session['role'] = user['Role']
            session['customer_id'] = user['CUSTOMER_ID']
            return jsonify({'message': 'Login successful', 'role': user['Role']}), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    finally:
        cursor.close()
        conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

# --- CRUD Operations for HKR_CUSTOMER ---

@app.route('/api/customers', methods=['POST'])
@login_required
@employee_required # Example: Only employees can create new customer records
def create_customer():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Prepared statement against SQL Injection
        query = """INSERT INTO HKR_CUSTOMER 
                   (CUSTOMER_ID, First_Name, Last_Name, Street_Address, City, State, Zip_Code, Gender, Marital_Status, Customer_Type) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        values = (
            data['customer_id'], data['first_name'], data['last_name'], 
            data['street_address'], data['city'], data['state'], 
            data['zip_code'], data.get('gender'), data['marital_status'], data['customer_type']
        )
        cursor.execute(query, values)
        conn.commit() # Transaction management
        return jsonify({'message': 'Customer created successfully'}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
@login_required
def get_customer(customer_id):
    # Authorization check: Customers can only view their own data 
    if session.get('role') == 'C' and session.get('customer_id') != customer_id:
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
    if session.get('role') == 'C' and session.get('customer_id') != customer_id:
        return jsonify({'error': 'Forbidden.'}), 403

    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(prepared=True)
    
    try:
        # Example of partial update mapping
        query = """UPDATE HKR_CUSTOMER 
                   SET Street_Address = %s, City = %s, State = %s, Zip_Code = %s 
                   WHERE CUSTOMER_ID = %s"""
        values = (data['street_address'], data['city'], data['state'], data['zip_code'], customer_id)
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Customer not found or no changes made'}), 404
            
        return jsonify({'message': 'Customer updated successfully'}), 200
    except Error as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
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
        if session.get('role') == 'C' and session.get('customer_id') != policy['CUSTOMER_ID']:
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
        if session.get('role') == 'C' and session.get('customer_id') != invoice['CUSTOMER_ID']:
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

        if session.get('role') == 'C' and session.get('customer_id') != payment['CUSTOMER_ID']:
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

        if session.get('role') == 'C' and session.get('customer_id') != policy['CUSTOMER_ID']:
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

        if session.get('role') == 'C' and session.get('customer_id') != invoice['CUSTOMER_ID']:
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

        if session.get('role') == 'C' and session.get('customer_id') != payment['CUSTOMER_ID']:
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

        if session.get('role') == 'C' and session.get('customer_id') != home['CUSTOMER_ID']:
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

        if session.get('role') == 'C' and session.get('customer_id') != vehicle['CUSTOMER_ID']:
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

if __name__ == '__main__':
    app.run(debug=True)