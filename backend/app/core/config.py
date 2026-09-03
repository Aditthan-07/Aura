"""
Application configuration, loaded from environment variables.

Keeping all env access in one place means the rest of the app never
touches os.environ directly — easier to test, easier to reason about.
"""
import os
from functools import lru_cache

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        gemini_api_key: str | None = None
        gemini_api_keys: str | None = None
        gemini_model: str = "gemini-2.5-flash"
        allowed_origins: str = "http://localhost:5173"
        max_history_messages: int = 20  # turns kept in context, trimmed client-side too
        max_retries_per_key: int = 2
        base_cooldown_seconds: float = 30.0

        model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

        @property
        def api_keys_list(self) -> list[str]:
            keys = []
            if self.gemini_api_keys:
                keys.extend([k.strip() for k in self.gemini_api_keys.split(",") if k.strip()])
            if self.gemini_api_key and self.gemini_api_key.strip() not in keys:
                keys.append(self.gemini_api_key.strip())
            return keys

        @property
        def origins_list(self) -> list[str]:
            return [origin.strip() for origin in self.allowed_origins.split(",")]

except ImportError:
    class Settings:
        def __init__(self):
            self.gemini_api_key = os.getenv("GEMINI_API_KEY")
            self.gemini_api_keys = os.getenv("GEMINI_API_KEYS")
            self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            self.allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
            self.max_history_messages = int(os.getenv("MAX_HISTORY_MESSAGES", 20))
            self.max_retries_per_key = 2
            self.base_cooldown_seconds = 30.0

        @property
        def api_keys_list(self) -> list[str]:
            keys = []
            if self.gemini_api_keys:
                keys.extend([k.strip() for k in self.gemini_api_keys.split(",") if k.strip()])
            if self.gemini_api_key and self.gemini_api_key.strip() not in keys:
                keys.append(self.gemini_api_key.strip())
            return keys

        @property
        def origins_list(self) -> list[str]:
            return [origin.strip() for origin in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Cached so we parse the .env file once per process, not per request."""
    return Settings()
