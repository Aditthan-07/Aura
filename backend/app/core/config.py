"""
Application configuration, loaded from environment variables.

Keeping all env access in one place means the rest of the app never
touches os.environ directly — easier to test, easier to reason about.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"
    allowed_origins: str = "http://localhost:5173"
    max_history_messages: int = 20  # turns kept in context, trimmed client-side too

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Cached so we parse the .env file once per process, not per request."""
    return Settings()
