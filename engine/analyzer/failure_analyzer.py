"""
TestCraft Engine - Failure Analyzer
Inspects runner traces, classifies failure root causes, and generates
targeted repair instructions for the repair loop.
"""

import re
from typing import Optional
from engine.models import TestRunReport, FailureDiagnosis

class FailureAnalyzer:
    """Analyzes failed test reports to synthesize a clear diagnosis and fix strategy."""

    @classmethod
    def diagnose(cls, report: TestRunReport, target_module_name: str) -> Optional[FailureDiagnosis]:
        if report.is_success:
            return None

        # Look for the first failing or error test case
        failing_case = next((tc for tc in report.test_cases if tc.status in ("failed", "error")), None)
        
        full_text = ""
        if failing_case:
            full_text = f"{failing_case.failure_message or ''}\n{failing_case.traceback or ''}"
        else:
            full_text = f"{report.raw_stdout}\n{report.raw_stderr}"

        # 1. Check for ModuleNotFoundError / ImportError
        import_match = re.search(r"(?:ModuleNotFoundError|ImportError):\s*(.+)", full_text)
        if import_match or f"No module named '{target_module_name}'" in full_text:
            err_line = import_match.group(0) if import_match else "Import error encountered"
            summary = f"Hallucinated import or invalid path: {err_line}"
            suggested_fix = (
                f"Fix the import statement in the test. The target module is named '{target_module_name}' "
                f"and is directly accessible. Use: 'from {target_module_name} import *' or 'import {target_module_name}'."
            )
            return FailureDiagnosis(
                category="import_hallucination",
                summary=summary,
                root_cause_test=failing_case.name if failing_case else "import",
                raw_error=full_text[:600],
                suggested_fix=suggested_fix
            )

        # 2. Check for Timeout
        if "TimedOut" in full_text or "execution_timeout" in (failing_case.name if failing_case else ""):
            return FailureDiagnosis(
                category="timeout",
                summary="Test execution timed out. Possible infinite loop or slow operation.",
                root_cause_test=failing_case.name if failing_case else "unknown",
                raw_error=full_text[:400],
                suggested_fix="Remove any blocking infinite loops, sleep calls, or excessively deep recursions in the test."
            )

        # 3. Check for AssertionError
        assert_match = re.search(r"AssertionError(?::\s*(.+))?", full_text)
        if assert_match or (failing_case and failing_case.status == "failed"):
            detail = assert_match.group(1) if (assert_match and assert_match.group(1)) else (failing_case.failure_message if failing_case else "Assertion failed")
            return FailureDiagnosis(
                category="assertion_failure",
                summary=f"Assertion failure: {detail}",
                root_cause_test=failing_case.name if failing_case else "unknown",
                raw_error=full_text[:800],
                suggested_fix=(
                    f"Align the test assertion with the actual behavior of the source code. "
                    f"Check what the source function really returns instead of assuming a different value."
                )
            )

        # 4. Check for AttributeError / TypeError (often calling a function with wrong signature or name)
        attr_match = re.search(r"(?:AttributeError|TypeError):\s*(.+)", full_text)
        if attr_match:
            err_line = attr_match.group(0)
            return FailureDiagnosis(
                category="runtime_exception",
                summary=f"Signature or attribute mismatch: {err_line}",
                root_cause_test=failing_case.name if failing_case else "unknown",
                raw_error=full_text[:600],
                suggested_fix="Ensure test calls only functions, classes, and arguments that actually exist in the source code."
            )

        # 5. Default generic error
        return FailureDiagnosis(
            category="runtime_exception",
            summary=f"Test failure in {failing_case.name if failing_case else 'test suite'}",
            root_cause_test=failing_case.name if failing_case else "unknown",
            raw_error=full_text[:600],
            suggested_fix="Review the traceback and update the test case to conform to the source code implementation."
        )
