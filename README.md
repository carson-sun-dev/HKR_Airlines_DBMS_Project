# HKR Insurance — Database Systems Project (Part II)

**Spring 2026 · CS-GY 6083-B · Principles of Database Systems**

Web application for **HKR Insurance**: policyholders manage their profile and view linked policies and billing; authorized employees administer customers, auto/home policies, invoices, payments, insured property, and drivers. The stack connects a **MySQL** relational database to a **Flask** REST API and a **React (TypeScript)** SPA with a U.S.-style policyholder and operations experience.

---

## Project overview

Part II builds on the Part I relational design. The implementation emphasizes secure SQL access (parameterized statements), role-based access (policyholder vs. employee), JWT-based sessions with refresh tokens, and client-side validation. The UI presents readable labels for tabular data (no raw `snake_case` column names in tables) and static guidance to contact a **dedicated HKR account administrator** when policyholders need changes beyond self-service.

---

## Team members

| Name | Net-ID | Role & responsibility |
| :--- | :--- | :--- |
| **Ruotong Qin** | rq2119 | Database structure design and Web UI design |
| **Hang Sun** | hs5957 | Database implement, testing and Web backend implement |
| **Kaishuai Sun** | ks8108 | Database data inserting and Web frontend implement |

---

## Technology stack

| Layer | Choice |
| :--- | :--- |
| **Database** | MySQL (`HKR_DB` schema; DDL and seeds under `sql/`) |
| **Backend** | Python **Flask**, **mysql-connector-python**, **Werkzeug** password hashing, **PyJWT** |
| **Frontend** | **React 18**, **TypeScript**, **Vite**, **React Router**, **Axios**, **Zod**, **Recharts** |
| **API** | REST (`/api/...`), JSON |

Dependencies: `requirements.txt` (backend), `web/package.json` (frontend).

---

## Repository layout

| Path | Contents |
| :--- | :--- |
| **`sql/`** | Schema creation (`01_*`), sample data, indexes, roles, analytical queries, transactions/procedures, web user table (`08_*`), etc. Run scripts in course-recommended order. |
| **`src/`** | Flask app (`app.py`), JWT helpers (`auth_tokens.py`), DB connection and REST routes. |
| **`web/`** | React SPA: layout, auth context, dashboard (stats / policyholder home), staff workspace blocks, shared table component with human-readable column titles. |
| **`docs/`** | Requirements, Part I materials, handoff notes as applicable. |
| **`.env`** (repo root) | Backend configuration: MySQL connection and secrets (`FLASK_SECRET_KEY`, `JWT_SECRET`). Edit the checked-in template for your environment. |

---

## Features (implemented direction)

1. **Authentication** — Register/login; roles **C** (policyholder, tied to `CUSTOMER_ID`) and **E** (employee). Access and refresh tokens; logout clears client storage.
2. **Policyholder portal** — View profile; update mailing address; look up own policies, invoices, payments, and related records by ID; report payments against invoices (methods aligned with backend: PayPal, Credit, Debit, Check).
3. **Operations console** — Employee-only routes: full CRUD-style workflows for auto/home policies, invoices, payments, insured homes/vehicles, drivers, and driver–vehicle links; company overview metrics and charts on the home dashboard.
4. **Security & integrity** — Prepared statements for mutating queries; authorization checks on routes; password hashing suitable for the deployed Python/OpenSSL environment.

---

## Quick start (local)

**Prerequisites:** Python 3.10+, Node.js 18+, MySQL Server.

1. **Database** — Create the database and objects using the scripts in `sql/` (starting with schema and user/account scripts your instructor specifies). Ensure sample customers exist before registering policyholder accounts that reference `customer_id`.

2. **Environment variables** — Edit **`.env`** in the project root (it ships as a template with placeholders). Set at least:

   | Variable | Purpose |
   | :--- | :--- |
   | `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | MySQL connection (`MYSQL_DATABASE` should match your schema, default `HKR_DB`). |
   | `FLASK_SECRET_KEY` | Flask session signing — use a long random string. |
   | `JWT_SECRET` | JWT access/refresh tokens — use a different long random string from `FLASK_SECRET_KEY` in production. |

   The backend loads `.env` via `python-dotenv` on startup. Optional: `JWT_ACCESS_MINUTES`, `JWT_REFRESH_DAYS` (see comments in `.env`).

3. **Backend run**

   ```bash
   cd src
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r ../requirements.txt
   python app.py
   ```

   Default Flask development server: `http://127.0.0.1:5000`.

4. **Frontend run**

   ```bash
   cd web
   npm install
   npm run dev
   ```

   Vite dev server (default `http://localhost:5173`) proxies `/api` to `http://127.0.0.1:5000` per `web/vite.config.ts`.


---

## Documentation & deliverables

- **Demo / walkthrough**: REST usage, UI flows (policyholder vs. employee), and execution of required analytical SQL where applicable.
- **Report**: PDF per course instructions (design, security, complex queries, etc.).

---

## Project highlights

*(Team may summarize differentiation—e.g., JWT flow, role enforcement, insurance domain modeling, UI professionalism.)*
