"""
TestCraft Engine - Terminal Reporter
Renders ANSI-colorized CLI outputs, formatted test execution tables,
failure diagnoses, and atomic run store write confirmations.
"""

from typing import Optional
from engine.models import TargetModule, TestRunReport, FailureDiagnosis, RepairAttempt, RunRecord

class TerminalColors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    GREEN = "\033[32m"
    RED = "\033[31m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    BG_GREEN = "\033[42m\033[30m"
    BG_RED = "\033[41m\033[37m"
    BG_YELLOW = "\033[43m\033[30m"

C = TerminalColors

class TerminalReporter:
    """Formats engine results into terminal output."""

    @staticmethod
    def print_banner():
        print(f"{C.BOLD}{C.CYAN}=================================================================={C.RESET}")
        print(f"{C.BOLD}{C.CYAN}       TestCraft - Autonomous LLM Pytest & Self-Healing Engine    {C.RESET}")
        print(f"{C.BOLD}{C.CYAN}=================================================================={C.RESET}")

    @staticmethod
    def print_target_analysis(target: TargetModule):
        print(f"\n{C.BOLD}[1/7] Source Analysis:{C.RESET} {C.BLUE}{target.filename}{C.RESET} ({target.module_name})")
        print(f"  • Size: {target.byte_size:,} bytes | Estimated Tokens: ~{target.estimated_tokens:,}")
        print(f"  • Functions: {', '.join(target.functions) if target.functions else 'None'}")
        print(f"  • Classes:   {', '.join(target.classes) if target.classes else 'None'}")
        print(f"  • Imported:  {', '.join(target.imported_libs) if target.imported_libs else 'None (stdlib only)'}")

    @staticmethod
    def print_generation_step(provider_name: str):
        print(f"\n{C.BOLD}[2/7] Generating Tests with Provider:{C.RESET} {C.MAGENTA}{provider_name}{C.RESET}")

    @staticmethod
    def print_syntax_check(is_valid: bool, error: Optional[str] = None):
        if is_valid:
            print(f"  {C.GREEN}✔ AST Syntax Validation Passed (Zero syntax errors){C.RESET}")
        else:
            print(f"  {C.RED}✘ AST Syntax Check Failed: {error}{C.RESET}")

    @staticmethod
    def print_import_check(target_imported: bool, error: Optional[str] = None):
        if target_imported:
            print(f"  {C.GREEN}✔ Target Import Verification Passed{C.RESET}")
        else:
            print(f"  {C.YELLOW}⚠ Target Import Warning: {error}{C.RESET}")

    @staticmethod
    def print_runner_results(report: TestRunReport, phase_name: str = "Initial Test Run"):
        print(f"\n{C.BOLD}[Execution: {phase_name}]{C.RESET} ({report.duration_ms:.1f}ms)")
        for tc in report.test_cases:
            if tc.status == "passed":
                status_badge = f"{C.GREEN}[PASSED]{C.RESET}"
            elif tc.status == "failed":
                status_badge = f"{C.RED}[FAILED]{C.RESET}"
            elif tc.status == "error":
                status_badge = f"{C.YELLOW}[ERROR] {C.RESET}"
            else:
                status_badge = f"{C.DIM}[SKIP]  {C.RESET}"

            print(f"  {status_badge} {tc.name} ({tc.duration_ms:.1f}ms)")
            if tc.failure_message:
                print(f"      {C.RED}└─ {tc.failure_message}{C.RESET}")

        summary_color = C.GREEN if report.is_success else C.RED
        print(f"\n  {summary_color}{C.BOLD}Summary:{C.RESET} {report.passed}/{report.total} passed, {report.failed} failed, {report.errors} errors (Exit Code: {report.exit_code})")

    @staticmethod
    def print_diagnosis(diagnosis: FailureDiagnosis):
        print(f"\n{C.BOLD}[Failure Analyzer Diagnosis]{C.RESET}")
        print(f"  • Category:      {C.YELLOW}{diagnosis.category}{C.RESET}")
        print(f"  • Summary:       {diagnosis.summary}")
        if diagnosis.suggested_fix:
            print(f"  • Suggested Fix: {C.CYAN}{diagnosis.suggested_fix}{C.RESET}")

    @staticmethod
    def print_repair_outcome(attempt: RepairAttempt):
        if attempt.success:
            print(f"\n{C.BG_GREEN} ✔ SELF-HEALING REPAIR SUCCEEDED {C.RESET} (Attempt #{attempt.attempt_number})")
        else:
            print(f"\n{C.BG_RED} ✘ SELF-HEALING REPAIR FAILED {C.RESET} (Attempt #{attempt.attempt_number})")

    @staticmethod
    def print_atomic_store_saved(filepath: str, run_id: str):
        print(f"\n{C.BOLD}[RunStore Atomic Commit]{C.RESET}")
        print(f"  {C.GREEN}✔ Run snapshot atomically written via os.replace to:{C.RESET}")
        print(f"    {filepath} (Run ID: {run_id})")
        print(f"{C.BOLD}{C.CYAN}=================================================================={C.RESET}\n")
