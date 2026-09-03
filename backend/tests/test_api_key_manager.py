import unittest
import time
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.services.api_key_manager import ApiKeyManager, KeyStatus

class TestApiKeyManager(unittest.TestCase):
    def test_single_key_init(self):
        mgr = ApiKeyManager()
        mgr._keys = []
        mgr._initialized = True

        class MockKey:
            def __init__(self):
                self.key = "test_key_12345"
                self.index = 0
                self.status = KeyStatus.HEALTHY
                self.cooldown_until = 0.0
                self.failure_count = 0
                self.consecutive_rate_limits = 0
                self.last_used_at = 0.0
                self.last_error_reason = ""
                self.masked_key = "test...2345"
                self.client = "mock_client"
            def is_available(self, t):
                return True

        mgr._keys = [MockKey()]
        client, idx, masked = mgr.get_client()
        self.assertEqual(idx, 0)
        self.assertEqual(masked, "test...2345")

    def test_multi_key_failover_on_429(self):
        mgr = ApiKeyManager()
        mgr._initialized = True
        
        class MockKey:
            def __init__(self, key, idx):
                self.key = key
                self.index = idx
                self.status = KeyStatus.HEALTHY
                self.cooldown_until = 0.0
                self.failure_count = 0
                self.consecutive_rate_limits = 0
                self.last_used_at = 0.0
                self.last_error_reason = ""
                self.masked_key = f"key_{idx}"
                self.client = f"client_{idx}"
            def is_available(self, t):
                return self.status == KeyStatus.HEALTHY and t >= self.cooldown_until

        mgr._keys = [MockKey("k0", 0), MockKey("k1", 1)]
        
        # 1. Select key 0
        c0, idx0, _ = mgr.get_client()
        self.assertEqual(idx0, 0)
        
        # 2. Record 429 on key 0 -> goes to cooldown
        mgr.record_rate_limit(0, retry_after=60.0)
        self.assertEqual(mgr._keys[0].status, KeyStatus.COOLDOWN)
        
        # 3. Next request automatically picks key 1
        c1, idx1, _ = mgr.get_client()
        self.assertEqual(idx1, 1)

    def test_all_keys_exhausted_raises_controlled_error(self):
        mgr = ApiKeyManager()
        mgr._initialized = True
        mgr._keys = []
        with self.assertRaises(RuntimeError) as ctx:
            mgr.get_client()
        self.assertIn("No Gemini API keys", str(ctx.exception))

if __name__ == "__main__":
    unittest.main()
