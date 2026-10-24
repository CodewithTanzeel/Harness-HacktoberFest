"""
TestCraft Engine - Self-Healing Repair Loop
Implements the single-attempt repair protocol to heal broken tests
while preventing infinite repair cycles.
"""

from typing import Tuple, Optional
from engine.models import TargetModule, TestRunReport, FailureDiagnosis, RepairAttempt
from engine.registry import LLMProvider
from engine.generate.parser import parse_syntax, verify_target_import, sanitize_and_fix_imports
from engine.runner.pytest_runner import PytestRunner
from engine.analyzer.failure_analyzer import FailureAnalyzer

class RepairLoop:
    """Manages the repair iteration when an untrusted test draft fails."""

    @classmethod
    def attempt_repair(
        cls,
        provider: LLMProvider,
        target: TargetModule,
        failed_test_code: str,
        failed_report: TestRunReport,
        runner: PytestRunner,
        run_id: str,
        attempt_number: int = 1
    ) -> Tuple[RepairAttempt, Optional[TestRunReport]]:
        """
        Diagnoses failure, prompts provider for repair, validates AST, and re-executes tests.
        """
        diagnosis = FailureAnalyzer.diagnose(failed_report, target.module_name)
        if not diagnosis:
            diagnosis = FailureDiagnosis(
                category="assertion_failure",
                summary="Test run produced non-zero exit code or failed tests",
                suggested_fix="Align test assertions with source module implementation"
            )

        failure_log = f"{failed_report.raw_stdout}\n{failed_report.raw_stderr}"

        # Request repair from provider
        repaired_raw = provider.repair_tests(
            source_code=target.code,
            module_name=target.module_name,
            failed_test_code=failed_test_code,
            failure_log=failure_log,
            diagnosis_summary=diagnosis.summary,
            suggested_fix=diagnosis.suggested_fix or ""
        )

        repaired_code = sanitize_and_fix_imports(repaired_raw, target.module_name)
        syntax_res = parse_syntax(repaired_code)

        if not syntax_res.is_valid:
            attempt = RepairAttempt(
                attempt_number=attempt_number,
                diagnosis=diagnosis,
                original_code=failed_test_code,
                repaired_code=repaired_code,
                syntax_valid=False,
                report_after_repair=None,
                success=False
            )
            return attempt, None

        # Re-execute repaired tests
        repair_run_id = f"{run_id}_repair_{attempt_number}"
        repaired_report = runner.run(repaired_code, target.filename, repair_run_id)

        success = repaired_report.is_success
        attempt = RepairAttempt(
            attempt_number=attempt_number,
            diagnosis=diagnosis,
            original_code=failed_test_code,
            repaired_code=repaired_code,
            syntax_valid=True,
            report_after_repair=repaired_report,
            success=success
        )

        return attempt, repaired_report
