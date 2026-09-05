"""
Application configuration supporting Groq (groq.com), Grok (xAI), and Gemini providers.
"""
import os
from functools import lru_cache
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(ENV_PATH, override=True)

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        # Groq (groq.com) Configuration
        groq_api_key: str | None = None
        groq_api_keys: str | None = None
        groq_model: str = "openai/gpt-oss-120b"
        groq_base_url: str = "https://api.groq.com/openai/v1"

        # Grok (xAI) Configuration
        grok_api_key: str | None = None
        grok_api_keys: str | None = None
        xai_api_key: str | None = None
        grok_model: str = "grok-2"
        grok_base_url: str = "https://api.x.ai/v1"

        # Gemini Configuration
        gemini_api_key: str | None = None
        gemini_api_keys: str | None = None
        gemini_model: str = "gemini-2.5-flash"

        # General Settings
        app_name: str = "ARCIS — Autonomous Reactor Core Intelligent System"
        app_version: str = "2.0.0"
        llm_provider: str = "auto"  # "auto", "groq", "grok", or "gemini"
        allowed_origins: str = "http://localhost:5173"
        max_history_messages: int = 20
        max_retries_per_key: int = 2
        base_cooldown_seconds: float = 30.0

        model_config = SettingsConfigDict(env_file=ENV_PATH, env_file_encoding="utf-8", extra="ignore")

        @property
        def groq_keys_list(self) -> list[str]:
            keys = []
            if self.groq_api_keys:
                keys.extend([k.strip() for k in self.groq_api_keys.split(",") if k.strip()])
            if self.groq_api_key and self.groq_api_key.strip() not in keys:
                keys.append(self.groq_api_key.strip())
            return keys

        @property
        def grok_keys_list(self) -> list[str]:
            keys = []
            if self.grok_api_keys:
                keys.extend([k.strip() for k in self.grok_api_keys.split(",") if k.strip()])
            if self.grok_api_key and self.grok_api_key.strip() not in keys:
                keys.append(self.grok_api_key.strip())
            if self.xai_api_key and self.xai_api_key.strip() not in keys:
                keys.append(self.xai_api_key.strip())
            return keys

        @property
        def gemini_keys_list(self) -> list[str]:
            keys = []
            if self.gemini_api_keys:
                keys.extend([k.strip() for k in self.gemini_api_keys.split(",") if k.strip()])
            if self.gemini_api_key and self.gemini_api_key.strip() not in keys:
                keys.append(self.gemini_api_key.strip())
            return keys

        @property
        def api_keys_list(self) -> list[str]:
            if self.active_provider == "groq":
                return self.groq_keys_list
            if self.active_provider == "grok":
                return self.grok_keys_list
            return self.gemini_keys_list

        @property
        def active_provider(self) -> str:
            if self.llm_provider in ("groq", "grok", "gemini"):
                return self.llm_provider
            if len(self.groq_keys_list) > 0:
                return "groq"
            if len(self.grok_keys_list) > 0:
                return "grok"
            if len(self.gemini_keys_list) > 0:
                return "gemini"
            return "groq"

        @property
        def origins_list(self) -> list[str]:
            return [origin.strip() for origin in self.allowed_origins.split(",")]

except ImportError:
    class Settings:
        def __init__(self):
            self.groq_api_key = os.getenv("GROQ_API_KEY")
            self.groq_api_keys = os.getenv("GROQ_API_KEYS")
            self.groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
            self.groq_base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

            self.grok_api_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
            self.grok_api_keys = os.getenv("GROK_API_KEYS")
            self.xai_api_key = os.getenv("XAI_API_KEY")
            self.grok_model = os.getenv("GROK_MODEL", "grok-2")
            self.grok_base_url = os.getenv("GROK_BASE_URL", "https://api.x.ai/v1")

            self.gemini_api_key = os.getenv("GEMINI_API_KEY")
            self.gemini_api_keys = os.getenv("GEMINI_API_KEYS")
            self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

            self.llm_provider = os.getenv("LLM_PROVIDER", "auto")
            self.allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
            self.max_history_messages = int(os.getenv("MAX_HISTORY_MESSAGES", 20))
            self.max_retries_per_key = 2
            self.base_cooldown_seconds = 30.0

        @property
        def groq_keys_list(self) -> list[str]:
            keys = []
            if self.groq_api_keys:
                keys.extend([k.strip() for k in self.groq_api_keys.split(",") if k.strip()])
            if self.groq_api_key and self.groq_api_key.strip() not in keys:
                keys.append(self.groq_api_key.strip())
            return keys

        @property
        def grok_keys_list(self) -> list[str]:
            keys = []
            if self.grok_api_keys:
                keys.extend([k.strip() for k in self.grok_api_keys.split(",") if k.strip()])
            if self.grok_api_key and self.grok_api_key.strip() not in keys:
                keys.append(self.grok_api_key.strip())
            if self.xai_api_key and self.xai_api_key.strip() not in keys:
                keys.append(self.xai_api_key.strip())
            return keys

        @property
        def gemini_keys_list(self) -> list[str]:
            keys = []
            if self.gemini_api_keys:
                keys.extend([k.strip() for k in self.gemini_api_keys.split(",") if k.strip()])
            if self.gemini_api_key and self.gemini_api_key.strip() not in keys:
                keys.append(self.gemini_api_key.strip())
            return keys

        @property
        def api_keys_list(self) -> list[str]:
            if self.active_provider == "groq":
                return self.groq_keys_list
            if self.active_provider == "grok":
                return self.grok_keys_list
            return self.gemini_keys_list

        @property
        def active_provider(self) -> str:
            if self.llm_provider in ("groq", "grok", "gemini"):
                return self.llm_provider
            if len(self.groq_keys_list) > 0:
                return "groq"
            if len(self.grok_keys_list) > 0:
                return "grok"
            if len(self.gemini_keys_list) > 0:
                return "gemini"
            return "groq"

        @property
        def origins_list(self) -> list[str]:
            return [origin.strip() for origin in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
