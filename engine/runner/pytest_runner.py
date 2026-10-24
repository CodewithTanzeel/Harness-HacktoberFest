"""
TestCraft Engine - Pytest Subprocess Runner
Solves the PYTHONPATH challenge by resolving absolute paths,
enforces execution isolation with strict timeouts, and converts JUnit XML
into rich TestRunReport domain models.
"""

import os
import sys
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET
from typing import Optional, List
from engine.models import TestRunReport, TestCaseResult
from engine.config import DEFAULT_CONFIG

class PytestRunner:
    """Manages isolated subprocess test runs with timeout and junit report extraction."""

    def __init__(self, timeout_seconds: float = DEFAULT_CONFIG.timeout_seconds):
        self.timeout_seconds = timeout_seconds

    def run(
        self,
        test_code: str,
        target_file_path: str,
        run_id: str
    ) -> TestRunReport:
        """
        Executes test_code in a subprocess.
        Resolves absolute path of target_file_path and its parent directory to prevent
        the PYTHONPATH import challenge.
        """
        start_time = time.perf_counter()
        abs_target_path = os.path.abspath(target_file_path)
        target_dir = os.path.dirname(abs_target_path)
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

        # Prepare isolated scratch directory
        os.makedirs(DEFAULT_CONFIG.scratch_dir, exist_ok=True)
        test_filename = f"test_run_{run_id}.py"
        test_file_path = os.path.join(DEFAULT_CONFIG.scratch_dir, test_filename)
        junit_xml_path = os.path.join(DEFAULT_CONFIG.scratch_dir, f"junit_{run_id}.xml")

        # Write the untrusted draft test code
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write(test_code)

        # Build clean environment with PYTHONPATH explicitly containing target_dir and project_root
        env = os.environ.copy()
        existing_pythonpath = env.get("PYTHONPATH", "")
        # Explicit absolute paths prepended: target_dir first, then project_root
        python_paths = [target_dir, project_root]
        if existing_pythonpath:
            python_paths.append(existing_pythonpath)
        env["PYTHONPATH"] = os.pathsep.join(python_paths)

        # Harness script path
        harness_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "harness.py"))
        cmd = [sys.executable, harness_path, test_file_path, junit_xml_path]

        raw_stdout = ""
        raw_stderr = ""
        exit_code = 0
        timed_out = False

        try:
            process = subprocess.run(
                cmd,
                cwd=target_dir,  # run in target directory so relative file lookups work
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=self.timeout_seconds
            )
            raw_stdout = process.stdout
            raw_stderr = process.stderr
            exit_code = process.returncode
        except subprocess.TimeoutExpired as e:
            timed_out = True
            exit_code = 124
            raw_stdout = (e.stdout or "") if isinstance(e.stdout, str) else ""
            raw_stderr = f"Subprocess TimedOut: Execution exceeded {self.timeout_seconds} seconds limit."
        except Exception as e:
            exit_code = 1
            raw_stderr = f"Execution failed: {str(e)}"

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # Parse JUnit XML if produced
        junit_content = ""
        test_cases: List[TestCaseResult] = []
        passed = 0
        failed = 0
        errors = 0
        skipped = 0

        if os.path.exists(junit_xml_path):
            try:
                with open(junit_xml_path, "r", encoding="utf-8") as xf:
                    junit_content = xf.read()
                test_cases = self._parse_junit_xml(junit_content)
                for tc in test_cases:
                    if tc.status == "passed":
                        passed += 1
                    elif tc.status == "failed":
                        failed += 1
                    elif tc.status == "error":
                        errors += 1
                    elif tc.status == "skipped":
                        skipped += 1
            except Exception as ex:
                raw_stderr += f"\nError reading JUnit report: {ex}"

        # If timed out or crashed without producing test cases
        if not test_cases:
            if timed_out:
                test_cases.append(TestCaseResult(
                    name="execution_timeout",
                    class_name="PytestRunner",
                    status="error",
                    duration_ms=elapsed_ms,
                    failure_message=f"Timeout after {self.timeout_seconds}s",
                    traceback="Execution terminated because subprocess exceeded timeout threshold."
                ))
                errors += 1
            elif exit_code != 0:
                test_cases.append(TestCaseResult(
                    name="runtime_error",
                    class_name="PytestRunner",
                    status="error",
                    duration_ms=elapsed_ms,
                    failure_message=raw_stderr.strip() or "Process exited with non-zero status",
                    traceback=raw_stdout + "\n" + raw_stderr
                ))
                errors += 1

        total = len(test_cases)

        return TestRunReport(
            run_id=run_id,
            timestamp=time.time(),
            total=total,
            passed=passed,
            failed=failed,
            errors=errors,
            skipped=skipped,
            duration_ms=elapsed_ms,
            exit_code=exit_code,
            test_cases=test_cases,
            junit_xml=junit_content,
            raw_stdout=raw_stdout,
            raw_stderr=raw_stderr
        )

    def _parse_junit_xml(self, xml_content: str) -> List[TestCaseResult]:
        results: List[TestCaseResult] = []
        if not xml_content.strip():
            return results

        try:
            root = ET.fromstring(xml_content)
            # Find all testcase nodes
            for tc_elem in root.findall(".//testcase"):
                name = tc_elem.attrib.get("name", "unknown_test")
                classname = tc_elem.attrib.get("classname", "")
                time_sec = float(tc_elem.attrib.get("time", "0.0"))
                duration_ms = time_sec * 1000.0

                status = "passed"
                fail_msg = None
                tb = None
                stdout = None

                fail_elem = tc_elem.find("failure")
                err_elem = tc_elem.find("error")
                skip_elem = tc_elem.find("skipped")
                out_elem = tc_elem.find("system-out")

                if fail_elem is not None:
                    status = "failed"
                    fail_msg = fail_elem.attrib.get("message", "Assertion failed")
                    tb = fail_elem.text
                elif err_elem is not None:
                    status = "error"
                    fail_msg = err_elem.attrib.get("message", "Test error")
                    tb = err_elem.text
                elif skip_elem is not None:
                    status = "skipped"
                    fail_msg = skip_elem.attrib.get("message", "Skipped")

                if out_elem is not None and out_elem.text:
                    stdout = out_elem.text

                results.append(TestCaseResult(
                    name=name,
                    class_name=classname,
                    status=status,
                    duration_ms=duration_ms,
                    failure_message=fail_msg,
                    traceback=tb,
                    stdout=stdout
                ))
        except Exception as e:
            print(f"Error parsing XML: {e}", file=sys.stderr)

        return results
