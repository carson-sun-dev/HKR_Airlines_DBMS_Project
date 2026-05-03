# 双 Token 认证（访问令牌 + 刷新令牌）
# 目的：支持 SPA 用 Authorization 头调用 API，减少依赖浏览器 Cookie；
# 访问令牌短时有效便于失效控制；刷新令牌较长，前端可配合本地缓存刷新 access。
import os
from datetime import datetime, timedelta, timezone

import jwt

# Loaded after dotenv in app.py — set JWT_SECRET in project root `.env`
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set in the environment or project root `.env` file.")
ALGORITHM = "HS256"
ACCESS_TTL_MINUTES = int(os.environ.get("JWT_ACCESS_MINUTES", "15"))
REFRESH_TTL_DAYS = int(os.environ.get("JWT_REFRESH_DAYS", "7"))


def _now():
    return datetime.now(timezone.utc)


def create_access_token(*, user_id: int, role: str, customer_id):
    """签发短期访问令牌，载荷含角色与客户编号（员工时 customer_id 可为 None）。"""
    exp = _now() + timedelta(minutes=ACCESS_TTL_MINUTES)
    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "role": role,
        "customer_id": customer_id,
        "typ": "access",
        "exp": exp,
        "iat": _now(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token(*, user_id: int):
    """签发刷新令牌；仅用于换取新的 access_token，不应附在每次业务请求里。"""
    exp = _now() + timedelta(days=REFRESH_TTL_DAYS)
    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "typ": "refresh",
        "exp": exp,
        "iat": _now(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str):
    """校验访问令牌；失败返回 None。"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("typ") != "access":
            return None
        return payload
    except jwt.PyJWTError:
        return None


def decode_refresh_token(token: str):
    """校验刷新令牌；失败返回 None。"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("typ") != "refresh":
            return None
        return payload
    except jwt.PyJWTError:
        return None


def access_ttl_seconds() -> int:
    return ACCESS_TTL_MINUTES * 60
