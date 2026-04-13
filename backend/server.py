from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import asyncpg
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import bcrypt
import jwt
import re
import html
import time
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'community-fund-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Super Admin phone
SUPER_ADMIN_PHONE = "+923142256184"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Database connection pool
pool = None

# Rate limiting for login
login_attempts = {}
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW = 900  # 15 minutes

# Fund allocation categories
FUND_CATEGORIES = [
    "school_fee",
    "health_expenses",
    "emergency",
    "wedding_support",
    "funeral_expenses",
    "housing_assistance",
    "business_loan",
    "food_assistance",
    "utility_bills",
    "medical_surgery",
    "education_scholarship",
    "other"
]

# Pydantic Models (request/response only)
class UserCreate(BaseModel):
    phone: str
    first_name: str
    last_name: str
    pin: str

class UserLogin(BaseModel):
    phone: str
    pin: str

class ActiveFeeConfigCreate(BaseModel):
    year: int
    monthly_amount: float

class FeeSubmissionCreate(BaseModel):
    user_id: str
    fee_type: str
    months: List[int]
    year: int
    amount: float

class FundAllocationCreate(BaseModel):
    recipient_name: str
    recipient_phone: Optional[str] = None
    category: str
    amount: float
    description: str

class AddMemberRequest(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None

class ApprovalAction(BaseModel):
    action: str
    comment: Optional[str] = None

class PromoteUser(BaseModel):
    user_id: str

class UpdateUserRequest(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None

class BulkUserAction(BaseModel):
    user_ids: List[str]
    action: str

class BulkApprovalAction(BaseModel):
    ids: List[str]
    action: str
    comment: Optional[str] = None


# ── Helper: convert asyncpg Record to JSON-safe dict ──
def row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    for key, value in d.items():
        if isinstance(value, uuid.UUID):
            d[key] = str(value)
        elif isinstance(value, datetime):
            d[key] = value.isoformat()
        elif isinstance(value, Decimal):
            d[key] = float(value)
        elif isinstance(value, list) and key == 'approvals':
            # already a list from JSONB
            pass
    return d

def rows_to_list(rows):
    return [row_to_dict(r) for r in rows]


# ── Helper functions ──
def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()

def verify_pin(pin: str, pin_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode(), pin_hash.encode())
    except Exception:
        import hashlib
        return hashlib.sha256(pin.encode()).hexdigest() == pin_hash

def sanitize_input(text: str) -> str:
    if text is None:
        return None
    return html.escape(text.strip())

def check_rate_limit(phone: str) -> bool:
    now = time.time()
    if phone in login_attempts:
        attempts = login_attempts[phone]
        if now - attempts["first_attempt"] > RATE_LIMIT_WINDOW:
            login_attempts[phone] = {"count": 1, "first_attempt": now}
            return True
        if attempts["count"] >= RATE_LIMIT_MAX:
            return False
        attempts["count"] += 1
        return True
    login_attempts[phone] = {"count": 1, "first_attempt": now}
    return True

def validate_pakistani_phone(phone: str) -> bool:
    pattern = r'^\+92\d{10}$'
    return bool(re.match(pattern, phone))

def normalize_phone(phone: str) -> str:
    phone = re.sub(r'[^\d+]', '', phone)
    if phone.startswith('0'):
        phone = '+92' + phone[1:]
    if not phone.startswith('+92'):
        phone = '+92' + phone
    return phone

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + 86400
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def user_response(row):
    """Return the standard user dict the frontend expects."""
    d = row_to_dict(row)
    return {
        "id": d["id"],
        "phone": d.get("phone"),
        "first_name": d["first_name"],
        "last_name": d["last_name"],
        "role": d["role"],
        "created_at": d["created_at"],
    }


# ── Dependency helpers ──
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = decode_token(credentials.credentials)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, phone, first_name, last_name, role, is_disabled, created_at FROM users WHERE id = $1",
            uuid.UUID(token_data["user_id"])
        )
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    return row_to_dict(row)

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_super_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user


# ── DB helper: create notification ──
async def create_notification(user_id: str, title: str, message: str, notif_type: str):
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO notifications (user_id, title, message, type)
               VALUES ($1, $2, $3, $4)""",
            uuid.UUID(user_id), title, message, notif_type
        )

async def create_audit_log(action: str, performed_by: str, target_id: str = None, details: str = None):
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO audit_logs (action, performed_by, target_id, details)
               VALUES ($1, $2, $3, $4)""",
            action, uuid.UUID(performed_by), target_id, details
        )


# ══════════════════════════════════════════════════════════
#  STARTUP / SHUTDOWN
# ══════════════════════════════════════════════════════════
@app.on_event("startup")
async def startup():
    global pool
    database_url = os.environ.get('DATABASE_URL', '')
    pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)

    # Ensure super admin exists
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE phone = $1", SUPER_ADMIN_PHONE)
        if not existing:
            await conn.execute(
                """INSERT INTO users (phone, first_name, last_name, pin_hash, role, is_disabled)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                SUPER_ADMIN_PHONE, "Super", "Admin", hash_pin("1234"), "super_admin", False
            )
            logging.info(f"Super Admin created: {SUPER_ADMIN_PHONE}")

@app.on_event("shutdown")
async def shutdown():
    global pool
    if pool:
        await pool.close()


# ══════════════════════════════════════════════════════════
#  AUTH ROUTES
# ══════════════════════════════════════════════════════════
@api_router.post("/auth/signup")
async def signup(data: UserCreate):
    phone = normalize_phone(data.phone)
    if not validate_pakistani_phone(phone):
        raise HTTPException(status_code=400, detail="Invalid Pakistani phone number. Use format: +923XXXXXXXXX")
    if len(data.pin) != 4 or not data.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits")

    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE phone = $1", phone)
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already registered")

        new_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        await conn.execute(
            """INSERT INTO users (id, phone, first_name, last_name, pin_hash, role, is_disabled, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
            new_id, phone, sanitize_input(data.first_name), sanitize_input(data.last_name),
            hash_pin(data.pin), "member", False, now
        )

    token = create_token(str(new_id), "member")
    return {
        "token": token,
        "user": {
            "id": str(new_id),
            "phone": phone,
            "first_name": sanitize_input(data.first_name),
            "last_name": sanitize_input(data.last_name),
            "role": "member",
            "created_at": now.isoformat()
        }
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    phone = normalize_phone(data.phone)
    if not check_rate_limit(phone):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, phone, first_name, last_name, pin_hash, role, is_disabled, created_at FROM users WHERE phone = $1",
            phone
        )

    if not row or not verify_pin(data.pin, row['pin_hash']):
        raise HTTPException(status_code=401, detail="Invalid phone number or PIN")

    user = row_to_dict(row)
    if user.get("is_disabled"):
        raise HTTPException(status_code=403, detail="Your account has been disabled. Contact an admin.")

    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "phone": user["phone"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "role": user["role"],
            "created_at": user["created_at"]
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "phone": user["phone"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "role": user["role"],
        "created_at": user["created_at"]
    }


# ══════════════════════════════════════════════════════════
#  USER MANAGEMENT ROUTES
# ══════════════════════════════════════════════════════════
@api_router.get("/users")
async def get_users(admin: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, phone, first_name, last_name, role, is_disabled, created_at FROM users ORDER BY created_at DESC LIMIT 1000"
        )
    return rows_to_list(rows)

@api_router.post("/users/add-member")
async def add_member(data: AddMemberRequest, admin: dict = Depends(require_super_admin)):
    phone = None
    if data.phone:
        phone = normalize_phone(data.phone)
        if validate_pakistani_phone(phone):
            async with pool.acquire() as conn:
                existing = await conn.fetchrow("SELECT id FROM users WHERE phone = $1", phone)
            if existing:
                raise HTTPException(status_code=400, detail="Phone number already registered")
        else:
            phone = None

    new_id = uuid.uuid4()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO users (id, phone, first_name, last_name, pin_hash, role, is_disabled)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            new_id, phone, sanitize_input(data.first_name), sanitize_input(data.last_name),
            None, "member", False
        )
    await create_audit_log("user_added", admin["id"], str(new_id),
                           f"Added member: {data.first_name} {data.last_name}")
    return {"message": "Member added successfully", "user_id": str(new_id)}

@api_router.post("/users/promote")
async def promote_to_admin(data: PromoteUser, admin: dict = Depends(require_super_admin)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, role FROM users WHERE id = $1", uuid.UUID(data.user_id))
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row['role'] == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot modify Super Admin")

    new_role = "admin" if row['role'] == "member" else "member"
    async with pool.acquire() as conn:
        await conn.execute("UPDATE users SET role = $1 WHERE id = $2", new_role, uuid.UUID(data.user_id))
    await create_audit_log("role_changed", admin["id"], data.user_id, f"Role changed to {new_role}")
    return {"message": f"User role changed to {new_role}", "new_role": new_role}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UpdateUserRequest, admin: dict = Depends(require_admin)):
    uid = uuid.UUID(user_id)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, role FROM users WHERE id = $1", uid)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row['role'] == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot modify Super Admin")

    phone = None
    if data.phone:
        phone = normalize_phone(data.phone)
        if validate_pakistani_phone(phone):
            async with pool.acquire() as conn:
                existing = await conn.fetchrow("SELECT id FROM users WHERE phone = $1 AND id != $2", phone, uid)
            if existing:
                raise HTTPException(status_code=400, detail="Phone number already registered")
        else:
            phone = None

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET first_name = $1, last_name = $2, phone = $3 WHERE id = $4",
            sanitize_input(data.first_name), sanitize_input(data.last_name), phone, uid
        )
    return {"message": "User updated successfully"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    uid = uuid.UUID(user_id)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, role, first_name, last_name FROM users WHERE id = $1", uid)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row['role'] == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot delete Super Admin")
    if str(row['id']) == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM users WHERE id = $1", uid)
    await create_audit_log("user_deleted", admin["id"], user_id,
                           f"Deleted user: {row['first_name']} {row['last_name']}")
    return {"message": "User deleted successfully"}

@api_router.post("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, admin: dict = Depends(require_admin)):
    uid = uuid.UUID(user_id)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, role, is_disabled FROM users WHERE id = $1", uid)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row['role'] == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot disable Super Admin")

    new_status = not row['is_disabled']
    async with pool.acquire() as conn:
        await conn.execute("UPDATE users SET is_disabled = $1 WHERE id = $2", new_status, uid)
    action = "disabled" if new_status else "enabled"
    await create_audit_log("user_status_changed", admin["id"], user_id, f"User {action}")
    return {"message": f"User {'disabled' if new_status else 'enabled'}", "is_disabled": new_status}

@api_router.post("/users/bulk-action")
async def bulk_user_action(data: BulkUserAction, admin: dict = Depends(require_super_admin)):
    if not data.user_ids:
        raise HTTPException(status_code=400, detail="No users selected")

    count = 0
    async with pool.acquire() as conn:
        for uid_str in data.user_ids:
            uid = uuid.UUID(uid_str)
            row = await conn.fetchrow("SELECT id, role FROM users WHERE id = $1", uid)
            if not row or row['role'] == "super_admin" or str(row['id']) == admin["id"]:
                continue
            if data.action == "disable":
                await conn.execute("UPDATE users SET is_disabled = TRUE WHERE id = $1", uid)
                await create_audit_log("user_status_changed", admin["id"], uid_str, "User disabled (bulk action)")
                count += 1
            elif data.action == "enable":
                await conn.execute("UPDATE users SET is_disabled = FALSE WHERE id = $1", uid)
                await create_audit_log("user_status_changed", admin["id"], uid_str, "User enabled (bulk action)")
                count += 1
            elif data.action == "delete":
                await conn.execute("DELETE FROM users WHERE id = $1", uid)
                await create_audit_log("user_deleted", admin["id"], uid_str, "User deleted (bulk action)")
                count += 1

    return {"message": f"{data.action.capitalize()} applied to {count} users", "count": count}


# ══════════════════════════════════════════════════════════
#  MONTHLY FEE ROUTES
# ══════════════════════════════════════════════════════════
@api_router.post("/fee-config")
async def set_fee_config(data: ActiveFeeConfigCreate, admin: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        await conn.execute("UPDATE fee_config SET is_active = FALSE WHERE year = $1", data.year)
        row = await conn.fetchrow(
            """INSERT INTO fee_config (year, monthly_amount, is_active, set_by)
               VALUES ($1, $2, $3, $4) RETURNING id, created_at""",
            data.year, data.monthly_amount, True, uuid.UUID(admin["id"])
        )
    return {
        "message": "Fee configuration set successfully",
        "monthly_amount": data.monthly_amount,
        "yearly_amount": data.monthly_amount * 12,
        "year": data.year
    }

@api_router.get("/fee-config")
async def get_fee_config(user: dict = Depends(get_current_user)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, year, monthly_amount, is_active, set_by, created_at FROM fee_config ORDER BY year DESC LIMIT 100"
        )
    return rows_to_list(rows)

@api_router.get("/fee-config/active")
async def get_active_fee_config(user: dict = Depends(get_current_user)):
    current_year = datetime.now(timezone.utc).year
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, year, monthly_amount, is_active, set_by, created_at FROM fee_config WHERE year = $1 AND is_active = TRUE",
            current_year
        )
        if not row:
            row = await conn.fetchrow(
                "SELECT id, year, monthly_amount, is_active, set_by, created_at FROM fee_config WHERE is_active = TRUE ORDER BY year DESC LIMIT 1"
            )
    return row_to_dict(row)


# ══════════════════════════════════════════════════════════
#  FEE SUBMISSION ROUTES
# ══════════════════════════════════════════════════════════
@api_router.post("/fee-submissions")
async def submit_fee(data: FeeSubmissionCreate, admin: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        target_user = await conn.fetchrow(
            "SELECT id, phone, first_name, last_name FROM users WHERE id = $1",
            uuid.UUID(data.user_id)
        )
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    async with pool.acquire() as conn:
        config = await conn.fetchrow(
            "SELECT monthly_amount FROM fee_config WHERE year = $1 AND is_active = TRUE", data.year
        )
    if not config:
        raise HTTPException(status_code=400, detail="No fee configuration set for this year")

    monthly_amount = float(config['monthly_amount'])

    if data.fee_type == "yearly":
        defined_amount = monthly_amount * 12
        months = list(range(1, 13))
    else:
        defined_amount = monthly_amount * len(data.months)
        months = data.months

    # Check for duplicate months
    async with pool.acquire() as conn:
        for month in months:
            existing = await conn.fetchrow(
                """SELECT id FROM fee_submissions
                   WHERE user_id = $1 AND year = $2 AND $3 = ANY(months) AND status != 'rejected'""",
                uuid.UUID(data.user_id), data.year, month
            )
            if existing:
                raise HTTPException(status_code=400, detail=f"Fee already submitted for month {month}")

    extra_donation = max(0, data.amount - defined_amount)
    new_id = uuid.uuid4()
    user_name = f"{target_user['first_name']} {target_user['last_name']}"
    admin_name = f"{admin['first_name']} {admin['last_name']}"

    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO fee_submissions
               (id, user_id, user_name, user_phone, fee_type, months, year, amount, defined_amount,
                extra_donation, status, submitted_by, submitted_by_name, approvals)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
            new_id, uuid.UUID(data.user_id), user_name, target_user['phone'],
            data.fee_type, months, data.year, data.amount, defined_amount,
            extra_donation, "pending", uuid.UUID(admin["id"]), admin_name,
            json.dumps([])
        )

    # Notify other admins
    fee_type_label = "Yearly" if data.fee_type == "yearly" else "Monthly"
    async with pool.acquire() as conn:
        admin_rows = await conn.fetch(
            "SELECT id FROM users WHERE role IN ('admin','super_admin') AND id != $1",
            uuid.UUID(admin["id"])
        )
    for a in admin_rows:
        await create_notification(
            str(a['id']),
            f"New {fee_type_label} Fee Submission",
            f"{fee_type_label} fee of PKR {data.amount} submitted for {user_name}",
            "fee_submitted"
        )

    return {
        "message": "Fee submission created",
        "id": str(new_id),
        "defined_amount": defined_amount,
        "extra_donation": extra_donation
    }

@api_router.get("/fee-submissions")
async def get_fee_submissions(
    status: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    conditions = []
    params = []
    idx = 1

    if status:
        conditions.append(f"status = ${idx}")
        params.append(status)
        idx += 1
    if user_id:
        conditions.append(f"user_id = ${idx}")
        params.append(uuid.UUID(user_id))
        idx += 1
    elif current_user["role"] == "member":
        conditions.append(f"user_id = ${idx}")
        params.append(uuid.UUID(current_user["id"]))
        idx += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    query = f"SELECT * FROM fee_submissions {where} ORDER BY created_at DESC LIMIT 1000"

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    results = rows_to_list(rows)
    # Parse JSONB approvals
    for r in results:
        if isinstance(r.get('approvals'), str):
            r['approvals'] = json.loads(r['approvals'])
    return results

@api_router.post("/fee-submissions/{submission_id}/approve")
async def approve_fee_submission(submission_id: str, data: ApprovalAction, admin: dict = Depends(require_admin)):
    sid = uuid.UUID(submission_id)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM fee_submissions WHERE id = $1", sid)
    if not row:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission = row_to_dict(row)
    if submission["status"] != "pending":
        raise HTTPException(status_code=400, detail="Submission already processed")

    approvals = submission.get("approvals", [])
    if isinstance(approvals, str):
        approvals = json.loads(approvals)

    for approval in approvals:
        if approval["admin_id"] == admin["id"]:
            raise HTTPException(status_code=400, detail="You have already voted on this submission")

    approval_record = {
        "admin_id": admin["id"],
        "admin_name": f"{admin['first_name']} {admin['last_name']}",
        "action": data.action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "comment": data.comment
    }
    approvals.append(approval_record)

    approve_count = sum(1 for a in approvals if a["action"] == "approve")
    reject_count = sum(1 for a in approvals if a["action"] == "reject")

    new_status = "pending"
    fee_type_label = "Yearly" if submission.get('fee_type') == "yearly" else "Monthly"

    if approve_count >= 2:
        new_status = "approved"
        await create_notification(submission["user_id"], "Fee Payment Approved",
            f"Your {fee_type_label.lower()} fee payment of PKR {submission['amount']} for {submission['year']} has been approved",
            "fee_approved")
        await create_audit_log("fee_approval", admin["id"], submission_id,
            f"Fee approved for {submission['user_name']}")
    elif reject_count >= 2:
        new_status = "rejected"
        await create_notification(submission["user_id"], "Fee Payment Rejected",
            f"Your {fee_type_label.lower()} fee payment of PKR {submission['amount']} for {submission['year']} has been rejected",
            "fee_rejected")
        await create_audit_log("fee_rejection", admin["id"], submission_id,
            f"Fee rejected for {submission['user_name']}")

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE fee_submissions SET approvals = $1, status = $2 WHERE id = $3",
            json.dumps(approvals), new_status, sid
        )

    return {"message": f"Vote recorded: {data.action}", "status": new_status}

@api_router.post("/fee-submissions/bulk-approve")
async def bulk_approve_fee_submissions(data: BulkApprovalAction, admin: dict = Depends(require_admin)):
    results = []
    for sid_str in data.ids:
        sid = uuid.UUID(sid_str)
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM fee_submissions WHERE id = $1", sid)
        if not row:
            continue
        submission = row_to_dict(row)
        if submission["status"] != "pending":
            continue

        approvals = submission.get("approvals", [])
        if isinstance(approvals, str):
            approvals = json.loads(approvals)
        if any(a["admin_id"] == admin["id"] for a in approvals):
            continue

        approval_record = {
            "admin_id": admin["id"],
            "admin_name": f"{admin['first_name']} {admin['last_name']}",
            "action": data.action,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "comment": data.comment
        }
        approvals.append(approval_record)

        approve_count = sum(1 for a in approvals if a["action"] == "approve")
        reject_count = sum(1 for a in approvals if a["action"] == "reject")
        new_status = "pending"
        fee_type_label = "Yearly" if submission.get('fee_type') == "yearly" else "Monthly"

        if approve_count >= 2:
            new_status = "approved"
            await create_notification(submission["user_id"], "Fee Payment Approved",
                f"Your {fee_type_label.lower()} fee payment of PKR {submission['amount']} has been approved", "fee_approved")
            await create_audit_log("fee_approval", admin["id"], sid_str,
                f"Fee approved for {submission['user_name']} (bulk)")
        elif reject_count >= 2:
            new_status = "rejected"
            await create_notification(submission["user_id"], "Fee Payment Rejected",
                f"Your {fee_type_label.lower()} fee payment of PKR {submission['amount']} has been rejected", "fee_rejected")
            await create_audit_log("fee_rejection", admin["id"], sid_str,
                f"Fee rejected for {submission['user_name']} (bulk)")

        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE fee_submissions SET approvals = $1, status = $2 WHERE id = $3",
                json.dumps(approvals), new_status, sid
            )
        results.append(sid_str)

    return {"message": f"Bulk {data.action} applied to {len(results)} submissions", "processed": len(results)}


# ══════════════════════════════════════════════════════════
#  FUND ALLOCATION ROUTES
# ══════════════════════════════════════════════════════════
@api_router.get("/fund-categories")
async def get_fund_categories():
    return FUND_CATEGORIES

@api_router.post("/fund-allocations")
async def create_fund_allocation(data: FundAllocationCreate, admin: dict = Depends(require_admin)):
    if data.category not in FUND_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")

    new_id = uuid.uuid4()
    admin_name = f"{admin['first_name']} {admin['last_name']}"

    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO fund_allocations
               (id, recipient_name, recipient_phone, category, amount, description,
                status, requested_by, requested_by_name, approvals)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
            new_id, sanitize_input(data.recipient_name), data.recipient_phone,
            data.category, data.amount, sanitize_input(data.description),
            "pending", uuid.UUID(admin["id"]), admin_name, json.dumps([])
        )

    # Notify other admins
    async with pool.acquire() as conn:
        admin_rows = await conn.fetch(
            "SELECT id FROM users WHERE role IN ('admin','super_admin') AND id != $1",
            uuid.UUID(admin["id"])
        )
    for a in admin_rows:
        await create_notification(
            str(a['id']),
            "New Fund Allocation Request",
            f"PKR {data.amount} requested for {data.recipient_name} ({data.category})",
            "allocation_submitted"
        )

    return {"message": "Fund allocation request created", "id": str(new_id)}

@api_router.get("/fund-allocations")
async def get_fund_allocations(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if status:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM fund_allocations WHERE status = $1 ORDER BY created_at DESC LIMIT 1000",
                status
            )
    else:
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM fund_allocations ORDER BY created_at DESC LIMIT 1000")

    results = rows_to_list(rows)
    for r in results:
        if isinstance(r.get('approvals'), str):
            r['approvals'] = json.loads(r['approvals'])
    return results

@api_router.post("/fund-allocations/{allocation_id}/approve")
async def approve_fund_allocation(allocation_id: str, data: ApprovalAction, admin: dict = Depends(require_admin)):
    aid = uuid.UUID(allocation_id)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM fund_allocations WHERE id = $1", aid)
    if not row:
        raise HTTPException(status_code=404, detail="Allocation not found")

    allocation = row_to_dict(row)
    if allocation["status"] != "pending":
        raise HTTPException(status_code=400, detail="Allocation already processed")

    approvals = allocation.get("approvals", [])
    if isinstance(approvals, str):
        approvals = json.loads(approvals)

    for approval in approvals:
        if approval["admin_id"] == admin["id"]:
            raise HTTPException(status_code=400, detail="You have already voted on this allocation")

    approval_record = {
        "admin_id": admin["id"],
        "admin_name": f"{admin['first_name']} {admin['last_name']}",
        "action": data.action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "comment": data.comment
    }
    approvals.append(approval_record)

    approve_count = sum(1 for a in approvals if a["action"] == "approve")
    reject_count = sum(1 for a in approvals if a["action"] == "reject")
    new_status = "pending"

    if approve_count >= 2:
        new_status = "approved"
        await create_notification(allocation["requested_by"], "Fund Allocation Approved",
            f"Your fund allocation of PKR {allocation['amount']} for {allocation['category']} has been approved",
            "allocation_approved")
        await create_audit_log("allocation_approval", admin["id"], allocation_id,
            f"Allocation approved for {allocation['recipient_name']}")
    elif reject_count >= 2:
        new_status = "rejected"
        await create_notification(allocation["requested_by"], "Fund Allocation Rejected",
            f"Your fund allocation request of PKR {allocation['amount']} for {allocation['category']} has been rejected",
            "allocation_rejected")
        await create_audit_log("allocation_rejection", admin["id"], allocation_id,
            f"Allocation rejected for {allocation['recipient_name']}")

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE fund_allocations SET approvals = $1, status = $2 WHERE id = $3",
            json.dumps(approvals), new_status, aid
        )

    return {"message": f"Vote recorded: {data.action}", "status": new_status}

@api_router.post("/fund-allocations/bulk-approve")
async def bulk_approve_fund_allocations(data: BulkApprovalAction, admin: dict = Depends(require_admin)):
    results = []
    for aid_str in data.ids:
        aid = uuid.UUID(aid_str)
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM fund_allocations WHERE id = $1", aid)
        if not row:
            continue
        allocation = row_to_dict(row)
        if allocation["status"] != "pending":
            continue

        approvals = allocation.get("approvals", [])
        if isinstance(approvals, str):
            approvals = json.loads(approvals)
        if any(a["admin_id"] == admin["id"] for a in approvals):
            continue

        approval_record = {
            "admin_id": admin["id"],
            "admin_name": f"{admin['first_name']} {admin['last_name']}",
            "action": data.action,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "comment": data.comment
        }
        approvals.append(approval_record)

        approve_count = sum(1 for a in approvals if a["action"] == "approve")
        reject_count = sum(1 for a in approvals if a["action"] == "reject")
        new_status = "pending"

        if approve_count >= 2:
            new_status = "approved"
            await create_notification(allocation["requested_by"], "Fund Allocation Approved",
                f"Fund allocation of PKR {allocation['amount']} for {allocation['category']} has been approved",
                "allocation_approved")
            await create_audit_log("allocation_approval", admin["id"], aid_str,
                f"Allocation approved for {allocation['recipient_name']} (bulk)")
        elif reject_count >= 2:
            new_status = "rejected"
            await create_notification(allocation["requested_by"], "Fund Allocation Rejected",
                f"Fund allocation of PKR {allocation['amount']} for {allocation['category']} has been rejected",
                "allocation_rejected")
            await create_audit_log("allocation_rejection", admin["id"], aid_str,
                f"Allocation rejected for {allocation['recipient_name']} (bulk)")

        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE fund_allocations SET approvals = $1, status = $2 WHERE id = $3",
                json.dumps(approvals), new_status, aid
            )
        results.append(aid_str)

    return {"message": f"Bulk {data.action} applied to {len(results)} allocations", "processed": len(results)}


# ══════════════════════════════════════════════════════════
#  DASHBOARD ROUTES
# ══════════════════════════════════════════════════════════
@api_router.get("/dashboard/member")
async def get_member_dashboard(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    current_year = datetime.now(timezone.utc).year

    async with pool.acquire() as conn:
        config_row = await conn.fetchrow(
            "SELECT monthly_amount FROM fee_config WHERE is_active = TRUE ORDER BY year DESC LIMIT 1"
        )
        monthly_amount = float(config_row['monthly_amount']) if config_row else 0

        submissions = await conn.fetch(
            "SELECT * FROM fee_submissions WHERE user_id = $1 ORDER BY created_at DESC",
            uuid.UUID(user_id)
        )

        total_collection_val = await conn.fetchval(
            "SELECT COALESCE(SUM(amount), 0) FROM fee_submissions WHERE status = 'approved'"
        )
        total_expense_val = await conn.fetchval(
            "SELECT COALESCE(SUM(amount), 0) FROM fund_allocations WHERE status = 'approved'"
        )

    submissions_list = rows_to_list(submissions)
    for s in submissions_list:
        if isinstance(s.get('approvals'), str):
            s['approvals'] = json.loads(s['approvals'])

    total_paid = sum(float(s["amount"]) for s in submissions_list if s["status"] == "approved")
    pending_submissions = [s for s in submissions_list if s["status"] == "pending"]
    paid_submissions = [s for s in submissions_list if s["status"] == "approved"]

    paid_months = set()
    for s in paid_submissions:
        if s.get("year") == current_year:
            paid_months.update(s.get("months", []))

    months_pending = 12 - len(paid_months)
    total_pending = months_pending * monthly_amount

    month_wise_paid = {}
    month_wise_pending = {}
    for s in paid_submissions:
        for month in s.get("months", []):
            key = f"{s['year']}-{month:02d}"
            if key not in month_wise_paid:
                month_wise_paid[key] = monthly_amount

    for month in range(1, 13):
        key = f"{current_year}-{month:02d}"
        if key not in month_wise_paid and config_row:
            month_wise_pending[key] = monthly_amount

    total_collection = float(total_collection_val)
    total_expense = float(total_expense_val)

    return {
        "total_pending_fee": max(0, total_pending),
        "total_paid_fee": total_paid,
        "month_wise_paid": month_wise_paid,
        "month_wise_pending": month_wise_pending,
        "pending_submissions": pending_submissions,
        "total_collection": total_collection,
        "total_expense": total_expense,
        "total_remaining": total_collection - total_expense,
        "monthly_amount": monthly_amount,
        "yearly_amount": monthly_amount * 12
    }

@api_router.get("/dashboard/admin")
async def get_admin_dashboard(admin: dict = Depends(require_admin)):
    current_year = datetime.now(timezone.utc).year

    async with pool.acquire() as conn:
        config_row = await conn.fetchrow(
            "SELECT monthly_amount FROM fee_config WHERE is_active = TRUE ORDER BY year DESC LIMIT 1"
        )
        monthly_amount = float(config_row['monthly_amount']) if config_row else 0

        all_submissions = rows_to_list(await conn.fetch(
            "SELECT * FROM fee_submissions ORDER BY created_at DESC LIMIT 10000"
        ))
        all_allocations = rows_to_list(await conn.fetch(
            "SELECT * FROM fund_allocations ORDER BY created_at DESC LIMIT 10000"
        ))
        all_users = rows_to_list(await conn.fetch(
            "SELECT id, phone, first_name, last_name, role, is_disabled, created_at FROM users ORDER BY created_at DESC"
        ))

    # Parse JSONB
    for s in all_submissions:
        if isinstance(s.get('approvals'), str):
            s['approvals'] = json.loads(s['approvals'])
    for a in all_allocations:
        if isinstance(a.get('approvals'), str):
            a['approvals'] = json.loads(a['approvals'])

    approved_fees = [s for s in all_submissions if s["status"] == "approved"]
    pending_fees = [s for s in all_submissions if s["status"] == "pending"]
    approved_allocations = [a for a in all_allocations if a["status"] == "approved"]
    pending_allocations = [a for a in all_allocations if a["status"] == "pending"]

    total_collection = sum(float(s["amount"]) for s in approved_fees)
    total_expense = sum(float(a["amount"]) for a in approved_allocations)
    total_remaining = total_collection - total_expense
    total_expected = monthly_amount * 12 * len(all_users)

    users_with_pending = {}
    for u in all_users:
        user_subs = [s for s in approved_fees if s["user_id"] == u["id"] and s.get("year") == current_year]
        paid_months = set()
        for s in user_subs:
            paid_months.update(s.get("months", []))
        months_pending = 12 - len(paid_months)
        pending_amount = months_pending * monthly_amount
        if pending_amount > 0:
            users_with_pending[u["id"]] = {
                "name": f"{u['first_name']} {u['last_name']}",
                "phone": u.get("phone"),
                "pending_amount": pending_amount,
                "paid_months": len(paid_months),
                "pending_months": months_pending
            }

    config_dict = None
    if config_row:
        config_dict = {"monthly_amount": monthly_amount, "is_active": True}

    return {
        "total_collection": total_collection,
        "total_expense": total_expense,
        "total_remaining": total_remaining,
        "total_expected": total_expected,
        "total_pending": max(0, total_expected - total_collection),
        "pending_fee_submissions": len(pending_fees),
        "pending_allocations": len(pending_allocations),
        "total_members": len(all_users),
        "users_with_pending": users_with_pending,
        "recent_submissions": all_submissions[:10],
        "recent_allocations": all_allocations[:10],
        "monthly_amount": monthly_amount,
        "yearly_amount": monthly_amount * 12,
        "fee_config": config_dict
    }


# ══════════════════════════════════════════════════════════
#  AUDIT LOGS
# ══════════════════════════════════════════════════════════
@api_router.get("/audit-logs")
async def get_audit_logs(admin: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500")
    return rows_to_list(rows)


# ══════════════════════════════════════════════════════════
#  EXPORT ROUTES
# ══════════════════════════════════════════════════════════
@api_router.get("/export/fees")
async def export_fees(year: Optional[int] = None, admin: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        if year:
            rows = await conn.fetch(
                "SELECT * FROM fee_submissions WHERE year = $1 ORDER BY created_at DESC", year
            )
        else:
            rows = await conn.fetch("SELECT * FROM fee_submissions ORDER BY created_at DESC")
    data = rows_to_list(rows)
    for d in data:
        if isinstance(d.get('approvals'), str):
            d['approvals'] = json.loads(d['approvals'])
    return {"data": data, "total": len(data)}

@api_router.get("/export/allocations")
async def export_allocations(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        if status:
            rows = await conn.fetch(
                "SELECT * FROM fund_allocations WHERE status = $1 ORDER BY created_at DESC", status
            )
        else:
            rows = await conn.fetch("SELECT * FROM fund_allocations ORDER BY created_at DESC")
    data = rows_to_list(rows)
    for d in data:
        if isinstance(d.get('approvals'), str):
            d['approvals'] = json.loads(d['approvals'])
    return {"data": data, "total": len(data)}


# ══════════════════════════════════════════════════════════
#  ANALYTICS
# ══════════════════════════════════════════════════════════
@api_router.get("/analytics")
async def get_analytics(admin: dict = Depends(require_admin)):
    current_year = datetime.now(timezone.utc).year

    async with pool.acquire() as conn:
        fee_rows = await conn.fetch(
            "SELECT months, amount FROM fee_submissions WHERE status = 'approved' AND year = $1",
            current_year
        )
        alloc_rows = await conn.fetch(
            "SELECT amount, category, created_at FROM fund_allocations WHERE status = 'approved'"
        )

    monthly_collections = {}
    for row in fee_rows:
        months_list = row['months'] or []
        per_month = float(row['amount']) / max(len(months_list), 1)
        for month in months_list:
            key = f"{current_year}-{month:02d}"
            monthly_collections[key] = monthly_collections.get(key, 0) + per_month

    monthly_expenses = {}
    category_breakdown = {}
    for row in alloc_rows:
        cat = row['category'] or 'other'
        amt = float(row['amount'])
        category_breakdown[cat] = category_breakdown.get(cat, 0) + amt

        created = row['created_at']
        if created and created.year == current_year:
            key = f"{current_year}-{created.month:02d}"
            monthly_expenses[key] = monthly_expenses.get(key, 0) + amt

    return {
        "monthly_collections": monthly_collections,
        "monthly_expenses": monthly_expenses,
        "category_breakdown": category_breakdown,
        "year": current_year
    }


# ══════════════════════════════════════════════════════════
#  NOTIFICATIONS
# ══════════════════════════════════════════════════════════
@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
            uuid.UUID(user["id"])
        )
    return rows_to_list(rows)

@api_router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    async with pool.acquire() as conn:
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE",
            uuid.UUID(user["id"])
        )
    return {"count": count}

@api_router.post("/notifications/mark-read")
async def mark_notifications_read(user: dict = Depends(get_current_user)):
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE",
            uuid.UUID(user["id"])
        )
    return {"message": "Notifications marked as read"}

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2",
            uuid.UUID(notification_id), uuid.UUID(user["id"])
        )
    return {"message": "Notification marked as read"}


# ══════════════════════════════════════════════════════════
#  HEALTH CHECK
# ══════════════════════════════════════════════════════════
@api_router.get("/")
async def root():
    return {"message": "Community Fund API", "status": "healthy"}


# ══════════════════════════════════════════════════════════
#  WIRE UP
# ══════════════════════════════════════════════════════════
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
