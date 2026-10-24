"""
TestCraft Engine - Pytest-Compatible Pure-Python Test Harness
Executes pytest-style test files (functions matching test_*, classes matching Test*),
evaluates assertions, captures stdout/stderr, measures duration per test,
and produces standard JUnit XML format output.
"""

import sys
import os
import time
import inspect
import traceback
import io
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

class PytestShim:
    """Provides a minimal pytest module shim (raises, fixture, mark, etc.) if pytest is not installed."""
    class raises:
        def __init__(self, expected_exception):
            self.expected_exception = expected_exception
            self.exc_info = None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            if exc_type is None:
                raise AssertionError(f"DID NOT RAISE {self.expected_exception.__name__}")
            if not issubclass(exc_type, self.expected_exception):
                return False  # Let unexpected exceptions bubble
            self.exc_info = (exc_type, exc_val, exc_tb)
            return True

    @staticmethod
    def fixture(fn):
        return fn

    class mark:
        @staticmethod
        def parametrize(*args, **kwargs):
            def decorator(fn):
                return fn
            return decorator

def run_test_module(test_filepath: str, junit_xml_path: str = None) -> int:
    """Executes all test functions in the given test file and outputs results."""
    # Ensure pytest shim is available in sys.modules if not installed
    if 'pytest' not in sys.modules:
        try:
            import pytest  # type: ignore
        except ImportError:
            sys.modules['pytest'] = PytestShim()

    start_total_time = time.perf_counter()
    test_results: List[Dict[str, Any]] = []

    # Import the test file dynamically as a module
    module_dir = os.path.dirname(os.path.abspath(test_filepath))
    test_filename = os.path.basename(test_filepath)
    test_modname = os.path.splitext(test_filename)[0]

    if module_dir not in sys.path:
        sys.path.insert(0, module_dir)

    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(test_modname, test_filepath)
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load spec for {test_filepath}")
        test_module = importlib.util.module_from_spec(spec)
        sys.modules[test_modname] = test_module
        spec.loader.exec_module(test_module)
    except Exception as e:
        tb = traceback.format_exc()
        print(f"FAILED TO IMPORT TEST SUITE: {e}\n{tb}", file=sys.stderr)
        # Create a single failure record for the collection error
        test_results.append({
            "name": "test_collection",
            "classname": test_modname,
            "status": "error",
            "duration_ms": 0.0,
            "message": str(e),
            "traceback": tb,
            "stdout": ""
        })
        _write_junit_and_exit(test_results, junit_xml_path, time.perf_counter() - start_total_time)
        return 1

    # Discover test functions and methods
    test_callables = []
    for attr_name in dir(test_module):
        attr = getattr(test_module, attr_name)
        if attr_name.startswith("test_") and callable(attr):
            test_callables.append((attr_name, "", attr))
        elif inspect.isclass(attr) and attr_name.startswith("Test"):
            inst = None
            try:
                inst = attr()
            except Exception:
                pass
            for method_name in dir(attr):
                if method_name.startswith("test_"):
                    method = getattr(inst or attr, method_name)
                    if callable(method):
                        test_callables.append((f"{attr_name}::{method_name}", attr_name, method))

    total = len(test_callables)
    if total == 0:
        print("No test functions found (expected functions starting with test_)")

    for name, classname, test_fn in test_callables:
        captured_stdout = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = captured_stdout

        t0 = time.perf_counter()
        status = "passed"
        fail_msg = None
        tb_str = None

        try:
            test_fn()
        except AssertionError as e:
            status = "failed"
            fail_msg = str(e) or "AssertionError"
            tb_str = traceback.format_exc()
        except Exception as e:
            status = "error"
            fail_msg = f"{type(e).__name__}: {str(e)}"
            tb_str = traceback.format_exc()
        finally:
            t1 = time.perf_counter()
            sys.stdout = old_stdout

        duration_ms = (t1 - t0) * 1000.0
        out_text = captured_stdout.getvalue()

        test_results.append({
            "name": name,
            "classname": classname or test_modname,
            "status": status,
            "duration_ms": duration_ms,
            "message": fail_msg,
            "traceback": tb_str,
            "stdout": out_text
        })

    total_duration = time.perf_counter() - start_total_time
    _write_junit_and_exit(test_results, junit_xml_path, total_duration)

    has_failures = any(r["status"] in ("failed", "error") for r in test_results)
    return 1 if has_failures else 0


def _write_junit_and_exit(results: List[Dict[str, Any]], xml_path: str, total_sec: float):
    passed_count = sum(1 for r in results if r["status"] == "passed")
    failed_count = sum(1 for r in results if r["status"] == "failed")
    error_count = sum(1 for r in results if r["status"] == "error")
    total_count = len(results)

    # Print terminal output resembling pytest
    print(f"\n============================= testcraft session starts ==============================")
    print(f"collected {total_count} items\n")

    for r in results:
        status_tag = r["status"].upper()
        if r["status"] == "passed":
            print(f"{r['name']} PASSED ({r['duration_ms']:.1f}ms)")
        elif r["status"] == "failed":
            print(f"{r['name']} FAILED ({r['duration_ms']:.1f}ms)")
            if r["message"]:
                print(f"    > {r['message']}")
        else:
            print(f"{r['name']} ERROR ({r['duration_ms']:.1f}ms)")
            if r["message"]:
                print(f"    > {r['message']}")

    if failed_count > 0 or error_count > 0:
        print("\n=================================== FAILURES ===================================")
        for r in results:
            if r["traceback"]:
                print(f"___________________________________ {r['name']} ___________________________________")
                print(r["traceback"])

    print(f"\n=================== {passed_count} passed, {failed_count} failed, {error_count} errors in {total_sec:.2f}s ===================")

    # Generate JUnit XML
    if xml_path:
        root = ET.Element("testsuite", {
            "name": "testcraft_suite",
            "tests": str(total_count),
            "failures": str(failed_count),
            "errors": str(error_count),
            "time": f"{total_sec:.3f}"
        })

        for r in results:
            tc = ET.SubElement(root, "testcase", {
                "name": r["name"],
                "classname": r["classname"],
                "time": f"{r['duration_ms'] / 1000.0:.3f}"
            })
            if r["status"] == "failed":
                fail_elem = ET.SubElement(tc, "failure", {
                    "message": r["message"] or "AssertionError",
                    "type": "AssertionError"
                })
                fail_elem.text = r["traceback"] or ""
            elif r["status"] == "error":
                err_elem = ET.SubElement(tc, "error", {
                    "message": r["message"] or "RuntimeError",
                    "type": "Error"
                })
                err_elem.text = r["traceback"] or ""
            if r["stdout"]:
                out_elem = ET.SubElement(tc, "system-out")
                out_elem.text = r["stdout"]

        try:
            tree = ET.ElementTree(root)
            tree.write(xml_path, encoding="utf-8", xml_declaration=True)
        except Exception as e:
            print(f"Failed to write JUnit XML: {e}", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 harness.py <test_file.py> [junit_xml_path]")
        sys.exit(2)

    test_file = sys.argv[1]
    xml_output = sys.argv[2] if len(sys.argv) > 2 else None
    exit_code = run_test_module(test_file, xml_output)
    sys.exit(exit_code)
