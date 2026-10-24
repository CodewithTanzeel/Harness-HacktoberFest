"""
TestCraft Engine - Configuration
Handles token budgeting, byte constraints, subprocess timeouts,
and atomic file store locations.
"""

import os
from dataclasses import dataclass

@dataclass
class EngineConfig:
    # 60KB byte budget protection
    max_file_bytes: int = 60000
    
    # 4 characters per token heuristic
    token_chars_ratio: int = 4
    
    # Subprocess execution timeout in seconds
    timeout_seconds: float = 10.0
    
    # One-repair attempt limit to avoid infinite loops and token waste
    max_repair_attempts: int = 1
    
    # Persistent storage directory for atomic run reports
    store_dir: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".testcraft", "runs"))
    
    # Scratch directory for running tests
    scratch_dir: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".testcraft", "scratch"))

    @staticmethod
    def estimate_tokens(text: str) -> int:
        return max(1, len(text) // 4)

DEFAULT_CONFIG = EngineConfig()
