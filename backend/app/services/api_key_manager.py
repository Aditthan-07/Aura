"""
ApiKeyManager: Intelligent Gemini API key management, failover, and rate-limit handling.

Features:
- Multi-key rotation and priority ordering.
- State tracking: HEALTHY, COOLDOWN, INVALID.
- Exponential backoff with jitter on 429/ResourceExhausted.
- Non-destructive failover to healthy keys.
- Safe logging (API keys are always masked).
"""

import enum
import logging
import math
import random
import threading
import time
from typing import NamedTuple

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class KeyStatus(str, enum.Enum):
    HEALTHY = "HEALTHY"
    COOLDOWN = "COOLDOWN"
    INVALID = "INVALID"


class KeyInfo:
    def __init__(self, key: str, index: int):
        self.key: str = key
        self.index: int = index
        self.status: KeyStatus = KeyStatus.HEALTHY
        self.cooldown_until: float = 0.0
        self.failure_count: int = 0
        self.consecutive_rate_limits: int = 0
        self.last_used_at: float = 0.0
        self.last_error_reason: str = ""
        self._client: genai.Client | None = None

    @property
    def masked_key(self) -> str:
        if len(self.key) <= 8:
            return "..." + self.key[-3:]
        return f"{self.key[:4]}...{self.key[-4:]}"

    @property
    def client(self):
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.key)
            except ImportError:
                self._client = type("MockClient", (), {"api_key": self.key})()
        return self._client

    def is_available(self, current_time: float) -> bool:
        if self.status == KeyStatus.INVALID:
            return False
        if self.status == KeyStatus.COOLDOWN:
            if current_time >= self.cooldown_until:
                self.status = KeyStatus.HEALTHY
                return True
            return False
        return True


class ApiKeyManager:
    def __init__(self):
        self._lock = threading.Lock()
        self._keys: list[KeyInfo] = []
        self._initialized = False

    def _ensure_initialized(self):
        if not self._initialized:
            settings = get_settings()
            keys_list = settings.api_keys_list
            if not keys_list and settings.gemini_api_key:
                keys_list = [settings.gemini_api_key]
            
            self._keys = [KeyInfo(k, idx) for idx, k in enumerate(keys_list)]
            self._initialized = True
            logger.info("Initialized ApiKeyManager with %d key(s)", len(self._keys))

    def get_client(self) -> tuple[object, int, str]:
        """
        Retrieves the best available Gemini client and key metadata.
        Returns: (client, key_index, masked_key)
        Raises: RuntimeError if all keys are exhausted or invalid.
        """
        with self._lock:
            self._ensure_initialized()
            now = time.time()

            if not self._keys:
                raise RuntimeError("No Gemini API keys configured. Set GEMINI_API_KEY in .env.")

            # Refresh cooldown states
            for k in self._keys:
                k.is_available(now)

            # Find available healthy keys first, sorted by least recently used
            available = [k for k in self._keys if k.is_available(now)]

            if not available:
                # Find earliest cooldown expiration
                cooldowns = [k.cooldown_until for k in self._keys if k.status == KeyStatus.COOLDOWN]
                wait_time = max(1.0, min(cooldowns) - now) if cooldowns else 30.0
                raise RuntimeError(
                    f"All {len(self._keys)} Gemini API key(s) are currently rate-limited or unavailable. "
                    f"Retry in {int(wait_time)}s."
                )

            # Select key with lowest consecutive failure count, then least recently used
            selected = min(available, key=lambda k: (k.consecutive_rate_limits, k.last_used_at))
            selected.last_used_at = now
            return selected.client, selected.index, selected.masked_key

    def record_success(self, key_index: int):
        with self._lock:
            if 0 <= key_index < len(self._keys):
                k = self._keys[key_index]
                k.status = KeyStatus.HEALTHY
                k.consecutive_rate_limits = 0
                k.cooldown_until = 0.0

    def record_rate_limit(self, key_index: int, retry_after: float | None = None, reason: str = ""):
        with self._lock:
            if 0 <= key_index < len(self._keys):
                k = self._keys[key_index]
                k.consecutive_rate_limits += 1
                k.failure_count += 1
                k.status = KeyStatus.COOLDOWN
                k.last_error_reason = reason or "Rate limit / Quota exceeded"

                settings = get_settings()
                base_delay = settings.base_cooldown_seconds
                # Exponential backoff: base_delay * (2 ^ (consecutive - 1)) + jitter
                exp_delay = base_delay * (2 ** min(4, k.consecutive_rate_limits - 1))
                jitter = random.uniform(1.0, 5.0)
                cooldown_duration = max(retry_after or 0.0, exp_delay + jitter)

                k.cooldown_until = time.time() + cooldown_duration
                logger.warning(
                    "Key [%s] rate-limited (streak=%d). Placed in cooldown for %.1fs.",
                    k.masked_key,
                    k.consecutive_rate_limits,
                    cooldown_duration,
                )

    def record_invalid_key(self, key_index: int, reason: str = ""):
        with self._lock:
            if 0 <= key_index < len(self._keys):
                k = self._keys[key_index]
                k.status = KeyStatus.INVALID
                k.last_error_reason = reason or "Invalid API Key (401/403)"
                logger.error("Key [%s] marked as INVALID: %s", k.masked_key, k.last_error_reason)

    def get_status_report(self) -> list[dict]:
        with self._lock:
            self._ensure_initialized()
            now = time.time()
            return [
                {
                    "index": k.index,
                    "masked_key": k.masked_key,
                    "status": k.status.value,
                    "available": k.is_available(now),
                    "cooldown_remaining_sec": max(0, int(k.cooldown_until - now)) if k.status == KeyStatus.COOLDOWN else 0,
                    "failure_count": k.failure_count,
                    "last_error": k.last_error_reason,
                }
                for k in self._keys
            ]


_api_key_manager = ApiKeyManager()


def get_api_key_manager() -> ApiKeyManager:
    return _api_key_manager
