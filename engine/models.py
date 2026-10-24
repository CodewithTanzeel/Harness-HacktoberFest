"""
TestCraft Engine - Domain Models & Data Structures
Defines immutable representations for targets, test drafts, validation results,
test runs, diagnoses, and atomic run store records.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
import time
import uuid

@dataclass
class TargetModule:
    """Represents the Python source file under test."""
    filename: str
    module_name: str
    code: str
    byte_size: int
    estimated_tokens: int
    imported_libs: List[str] = field(default_factory=list)
    functions: List[str] = field(default_factory=list)
    classes: List[str] = field(default_factory=list)
    absolute_dir: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class SyntaxCheckResult:
    """Result of AST parsing without executing code."""
    is_valid: bool
    error_message: Optional[str] = None
    lineno: Optional[int] = None
    offset: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ImportVerificationResult:
    """Detects and flags hallucinated or mismatched imports."""
    is_valid: bool
    expected_import: str
    found_imports: List[str] = field(default_factory=list)
    target_imported: bool = False
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class TestCaseResult:
    """Individual test outcome within a test suite run."""
    name: str
    class_name: str
    status: str  # 'passed' | 'failed' | 'error' | 'skipped'
    duration_ms: float
    failure_message: Optional[str] = None
    traceback: Optional[str] = None
    stdout: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class TestRunReport:
    """Aggregated result of executing a test suite."""
    run_id: str
    timestamp: float
    total: int
    passed: int
    failed: int
    errors: int
    skipped: int
    duration_ms: float
    exit_code: int
    test_cases: List[TestCaseResult] = field(default_factory=list)
    junit_xml: str = ""
    raw_stdout: str = ""
    raw_stderr: str = ""

    @property
    def is_success(self) -> bool:
        return self.failed == 0 and self.errors == 0 and self.total > 0

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['is_success'] = self.is_success
        return data

@dataclass
class FailureDiagnosis:
    """Categorized diagnosis from FailureAnalyzer."""
    category: str  # 'syntax' | 'import_hallucination' | 'assertion_failure' | 'fixture_missing' | 'timeout' | 'runtime_exception'
    summary: str
    root_cause_test: Optional[str] = None
    raw_error: Optional[str] = None
    suggested_fix: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class RepairAttempt:
    """Tracks each iteration of the self-healing repair loop."""
    attempt_number: int
    diagnosis: FailureDiagnosis
    original_code: str
    repaired_code: str
    syntax_valid: bool
    report_after_repair: Optional[TestRunReport] = None
    success: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class RunRecord:
    """Complete persistent snapshot written to RunStore."""
    id: str
    timestamp: float
    target_filename: str
    target_code: str
    module_name: str
    provider_name: str
    initial_test_code: str
    final_test_code: str
    status: str  # 'passed' | 'repaired' | 'failed' | 'syntax_error' | 'timeout'
    initial_report: Optional[TestRunReport] = None
    final_report: Optional[TestRunReport] = None
    repair_history: List[RepairAttempt] = field(default_factory=list)
    was_repaired: bool = False
    total_duration_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
