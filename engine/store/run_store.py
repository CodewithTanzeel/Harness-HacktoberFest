"""
TestCraft Engine - Atomic Run Store
Provides cross-platform atomic persistence (tempfile -> os.replace)
for test run records, diagnostic logs, and test artifacts.
"""

import os
import json
import tempfile
from typing import List, Dict, Any, Optional
from engine.config import DEFAULT_CONFIG
from engine.models import RunRecord

class RunStore:
    """Manages atomic persistence and retrieval of RunRecord artifacts."""

    def __init__(self, store_dir: str = DEFAULT_CONFIG.store_dir):
        self.store_dir = store_dir
        os.makedirs(self.store_dir, exist_ok=True)

    def save_run(self, record: RunRecord) -> str:
        """
        Atomically writes the RunRecord to store_dir using a temp file and os.replace.
        Guarantees that readers never observe partially written JSON files.
        """
        filename = f"run_{record.id}.json"
        dest_path = os.path.join(self.store_dir, filename)

        data = record.to_dict()
        json_content = json.dumps(data, indent=2, ensure_ascii=False)

        # Write to a temporary file in the same directory (so os.replace is an atomic inode rename)
        temp_fd, temp_path = tempfile.mkstemp(prefix="tc_run_", suffix=".tmp", dir=self.store_dir)
        try:
            with os.fdopen(temp_fd, "w", encoding="utf-8") as tf:
                tf.write(json_content)
                tf.flush()
                os.fsync(tf.fileno())

            # Atomic replace (cross-platform atomic rename)
            os.replace(temp_path, dest_path)
        except Exception:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
            raise

        return dest_path

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single run by ID."""
        path = os.path.join(self.store_dir, f"run_{run_id}.json")
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def list_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Lists metadata of recent runs, sorted newest first."""
        if not os.path.exists(self.store_dir):
            return []

        runs = []
        for name in os.listdir(self.store_dir):
            if name.startswith("run_") and name.endswith(".json"):
                full_path = os.path.join(self.store_dir, name)
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        runs.append({
                            "id": data.get("id"),
                            "timestamp": data.get("timestamp"),
                            "target_filename": data.get("target_filename"),
                            "module_name": data.get("module_name"),
                            "provider_name": data.get("provider_name"),
                            "status": data.get("status"),
                            "was_repaired": data.get("was_repaired", False),
                            "passed": data.get("final_report", {}).get("passed", 0),
                            "total": data.get("final_report", {}).get("total", 0),
                            "duration_ms": data.get("total_duration_ms", 0.0)
                        })
                except Exception:
                    continue

        # Sort descending by timestamp
        runs.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        return runs[:limit]
