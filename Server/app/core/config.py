from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    mongouri: str
    db_name: str = "PrepMateAI"
    jwt_secret: str
    redis_url: str
    llm_provider: str = "groq"
    groq_api_key: str
    groq_model: str = "openai/gpt-oss-20b"
    groq_fast_model: str = ""
    groq_max_tokens: int = 4096
    groq_reasoning_effort: str = "low"
    client_url: str = "http://localhost:5173"

    jwt_expire_seconds: int = 24 * 60 * 60
    max_resume_bytes: int = 5 * 1024 * 1024
    max_resume_chars: int = 12_000
    max_jd_chars: int = 8_000
    report_cache_ttl: int = 7 * 24 * 60 * 60

    @field_validator("jwt_secret")
    @classmethod
    def _strong_secret(cls, v: str) -> str:
        if len(v) < 24:
            raise ValueError("JWT_SECRET must be at least 24 characters")
        return v

    @field_validator("groq_api_key")
    @classmethod
    def _non_empty_groq_key(cls, v: str) -> str:
        value = v.strip()
        if not value:
            raise ValueError("GROQ_API_KEY must be set to a valid Groq API key")
        return value

    @field_validator("groq_max_tokens")
    @classmethod
    def _valid_groq_max_tokens(cls, v: int) -> int:
        if v < 1024:
            raise ValueError("GROQ_MAX_TOKENS must be at least 1024")
        return v

    @property
    def is_prod(self) -> bool:
        return self.env == "production"

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.client_url.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
