import hashlib
import time

import bcrypt
import jwt
from fastapi import Cookie, HTTPException, status

from .config import get_settings
from .db import redis


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt(rounds=10)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except ValueError:
        return False


def create_token(user_id: str, username: str) -> str:
    s = get_settings()
    now = int(time.time())
    return jwt.encode(
        {"id": user_id, "username": username, "iat": now, "exp": now + s.jwt_expire_seconds},
        s.jwt_secret,
        algorithm="HS256",
    )


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def current_user(token: str | None = Cookie(default=None)) -> dict:
    """FastAPI dependency: validates the JWT cookie and the Redis blacklist."""
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token not provided")
    if await redis().get(f"blacklist:{token_hash(token)}"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has been revoked")
    try:
        return jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Token")
