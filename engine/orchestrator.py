"""
TestCraft Engine - Pipeline Orchestrator
Coordinates the end-to-end lifecycle: analysis, token budgeting, generation,
AST validation, isolated execution, failure diagnosis, repair loop, and atomic storage.
"""

import os
import time
import uuid
from typing import Optional, Dict, Any

from engine.models import TargetModule, RunRecord, RepairAttempt
from engine.config import DEFAULT_CONFIG, EngineConfig
from engine.registry import ProviderRegistry, LLMProvider
from engine.generate.parser import extract_module_symbols, parse_syntax, verify_target_import
from engine.generate.generator import TestGenerator
from engine.runner.pytest_runner import PytestRunner
from engine.repair.repair_loop import RepairLoop
from engine.store.run_store import RunStore
from engine.reporter.terminal import TerminalReporter

class Orchestrator:
    """The central pipeline coordinator."""

    def __init__(
        self,
        config: EngineConfig = DEFAULT_CONFIG,
        store: Optional[RunStore] = None,
        runner: Optional[PytestRunner] = None
    ):
        self.config = config
        self.store = store or RunStore(store_dir=config.store_dir)
        self.runner = runner or PytestRunner(timeout_seconds=config.timeout_seconds)

    def analyze_source(self, filepath: str, code_content: Optional[str] = None) -> TargetModule:
        """Loads and inspects the Python target file, validating size and token budget."""
        abs_path = os.path.abspath(filepath)
        filename = os.path.basename(abs_path)
        module_name = os.path.splitext(filename)[0]

        if code_content is None:
            if not os.path.exists(abs_path):
                raise FileNotFoundError(f"Target file does not exist: {filepath}")
            with open(abs_path, "r", encoding="utf-8") as f:
                code = f.read()
        else:
            code = code_content

        byte_size = len(code.encode("utf-8"))
        if byte_size > self.config.max_file_bytes:
            raise ValueError(
                f"File size {byte_size} bytes exceeds configured safety limit of {self.config.max_file_bytes} bytes."
            )

        estimated_tokens = self.config.estimate_tokens(code)
        imported_libs, functions, classes = extract_module_symbols(code)

        return TargetModule(
            filename=abs_path,
            module_name=module_name,
            code=code,
            byte_size=byte_size,
            estimated_tokens=estimated_tokens,
            imported_libs=imported_libs,
            functions=functions,
            classes=classes,
            absolute_dir=os.path.dirname(abs_path)
        )

    def execute_pipeline(
        self,
        filepath: str,
        provider_id: str = "fake",
        code_override: Optional[str] = None,
        test_code_override: Optional[str] = None,
        verbose: bool = True
    ) -> RunRecord:
        """
        Executes the full test pipeline:
        1. Source analysis & token/byte budget verification
        2. Test generation (or test override if provided)
        3. AST & import sanity checks
        4. Subprocess execution with isolated PYTHONPATH
        5. Failure diagnosis and one-shot repair loop if failed
        6. Atomic RunStore commit
        """
        start_time = time.perf_counter()
        run_id = uuid.uuid4().hex[:10]

        # 1. Source analysis
        target = self.analyze_source(filepath, code_override)
        if verbose:
            TerminalReporter.print_banner()
            TerminalReporter.print_target_analysis(target)

        # Retrieve provider
        provider = ProviderRegistry.get(provider_id)
        if not provider:
            # Fallback to default fake provider if unknown
            provider = ProviderRegistry.get("fake")
        provider_name = provider.display_name if provider else provider_id

        # 2. Test generation or override
        if test_code_override:
            test_code = test_code_override
            syntax_res = parse_syntax(test_code)
            import_res = verify_target_import(test_code, target.module_name)
        else:
            if verbose:
                TerminalReporter.print_generation_step(provider_name)
            test_code, syntax_res, import_res = TestGenerator.generate(provider, target)

        if verbose:
            TerminalReporter.print_syntax_check(syntax_res.is_valid, syntax_res.error_message)
            TerminalReporter.print_import_check(import_res.is_valid, import_res.error_message)

        # 3. Initial Subprocess Test Execution
        initial_report = self.runner.run(test_code, target.filename, run_id)
        if verbose:
            TerminalReporter.print_runner_results(initial_report, "Initial Test Run")

        repair_history = []
        final_test_code = test_code
        final_report = initial_report
        was_repaired = False

        # 4. Check if repair loop is needed
        if not initial_report.is_success and self.config.max_repair_attempts > 0:
            if verbose:
                from engine.analyzer.failure_analyzer import FailureAnalyzer
                diag = FailureAnalyzer.diagnose(initial_report, target.module_name)
                if diag:
                    TerminalReporter.print_diagnosis(diag)

            repair_attempt, repaired_report = RepairLoop.attempt_repair(
                provider=provider,
                target=target,
                failed_test_code=test_code,
                failed_report=initial_report,
                runner=self.runner,
                run_id=run_id,
                attempt_number=1
            )
            repair_history.append(repair_attempt)

            if repair_attempt.success and repaired_report:
                was_repaired = True
                final_test_code = repair_attempt.repaired_code
                final_report = repaired_report

            if verbose:
                TerminalReporter.print_repair_outcome(repair_attempt)
                if repaired_report:
                    TerminalReporter.print_runner_results(repaired_report, "Post-Repair Test Run")

        total_elapsed = (time.perf_counter() - start_time) * 1000.0

        # Determine overall status
        if final_report.is_success:
            status = "repaired" if was_repaired else "passed"
        else:
            status = "failed"

        # 5. Create persistent record
        record = RunRecord(
            id=run_id,
            timestamp=time.time(),
            target_filename=os.path.basename(target.filename),
            target_code=target.code,
            module_name=target.module_name,
            provider_name=provider_name,
            initial_test_code=test_code,
            final_test_code=final_test_code,
            status=status,
            initial_report=initial_report,
            final_report=final_report,
            repair_history=repair_history,
            was_repaired=was_repaired,
            total_duration_ms=total_elapsed
        )

        # 6. Atomic save to RunStore
        saved_path = self.store.save_run(record)
        if verbose:
            TerminalReporter.print_atomic_store_saved(saved_path, run_id)

        return record
