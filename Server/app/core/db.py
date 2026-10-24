import logging

import redis.asyncio as aioredis
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import get_settings

log = logging.getLogger("prepmate.db")

_mongo: AsyncIOMotorClient | None = None
_redis: aioredis.Redis | None = None


async def connect() -> None:
    global _mongo, _redis
    s = get_settings()
    _mongo = AsyncIOMotorClient(s.mongouri, serverSelectionTimeoutMS=8000)
    await _mongo.admin.command("ping")
    db = _mongo[s.db_name]
    # Unique identity + fast per-user report listing
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.interviewreports.create_index([("user", 1), ("createdAt", -1)])
    log.info("MongoDB connected (%s)", s.db_name)

    _redis = aioredis.from_url(s.redis_url, decode_responses=True)
    await _redis.ping()
    log.info("Redis connected")


async def disconnect() -> None:
    if _mongo:
        _mongo.close()
    if _redis:
        await _redis.aclose()


def db() -> AsyncIOMotorDatabase:
    assert _mongo is not None, "Mongo not connected"
    return _mongo[get_settings().db_name]


def redis() -> aioredis.Redis:
    assert _redis is not None, "Redis not connected"
    return _redis
