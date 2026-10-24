import time

import jwt
from bson import ObjectId
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pymongo.errors import DuplicateKeyError

from ..core.config import get_settings
from ..core.db import db, redis
from ..core.security import (create_token, current_user, hash_password, token_hash,
                             verify_password)
from ..models.schemas import LoginIn, RegisterIn

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _cookie_kwargs() -> dict:
    s = get_settings()
    return dict(
        httponly=True,
        secure=s.is_prod,
        samesite="none" if s.is_prod else "lax",
        path="/",
    )


def _set_cookie(res: Response, token: str) -> None:
    res.set_cookie("token", token, max_age=get_settings().jwt_expire_seconds, **_cookie_kwargs())


def _public(user: dict) -> dict:
    return {"id": str(user["_id"]), "username": user["username"], "email": user["email"]}


@router.post("/register", status_code=201)
async def register(body: RegisterIn, res: Response):
    email = body.email.lower()
    if await db().users.find_one({"$or": [{"email": email}, {"username": body.username}]}):
        raise HTTPException(400, "User already exists with this email or username")
    doc = {"username": body.username, "email": email, "password": hash_password(body.password)}
    try:
        result = await db().users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(400, "User already exists with this email or username")
    doc["_id"] = result.inserted_id
    _set_cookie(res, create_token(str(doc["_id"]), doc["username"]))
    return {"message": "User created successfully", "user": _public(doc)}


@router.post("/login")
async def login(body: LoginIn, res: Response):
    user = await db().users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(400, "Invalid email or password")
    _set_cookie(res, create_token(str(user["_id"]), user["username"]))
    return {"message": "User logged in successfully", "user": _public(user)}


@router.get("/logout")
async def logout(res: Response, token: str | None = Cookie(default=None)):
    if not token:
        raise HTTPException(400, "User is already logged out")
    try:
        decoded = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
        remaining = int(decoded["exp"] - time.time())
        if remaining > 0:
            await redis().set(f"blacklist:{token_hash(token)}", "true", ex=remaining)
    except jwt.PyJWTError:
        pass  # already invalid; just clear the cookie
    res.delete_cookie("token", **_cookie_kwargs())
    return {"message": "User logged out successfully"}


@router.get("/get-me")
async def get_me(payload: dict = Depends(current_user)):
    user = await db().users.find_one({"_id": ObjectId(payload["id"])})
    if not user:
        raise HTTPException(401, "User no longer exists")
    return {"message": "User details fetched successfully", "user": _public(user)}
