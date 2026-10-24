# 🛠️ TestCraft: Autonomous Python Test Generator & Self-Healing CLI

> **Turn any Python source file into a robust, passing pytest suite in seconds.**  
> TestCraft autonomously analyzes your Python modules, extracts testing specifications, generates unit tests, validates syntax trees, executes tests in an isolated subprocess with explicit `PYTHONPATH` resolution, and automatically self-heals broken assertions.

---

## ⚡ Quick Start: `ValidateKaro` Anywhere on the Computer

`ValidateKaro` is designed to be executed **from ANY path or directory on your computer, regardless of where you are in your filesystem**:

```bash
# Navigate to any folder on your machine:
cd /home/user/my_project
# or C:\Users\developer\projects\ecommerce

# Execute ValidateKaro on any local module:
ValidateKaro my_service.py

# Or run the self-diagnostic harness on the environment:
ValidateKaro
```

### 🚀 Cross-Platform Support (Unix, Windows CMD, PowerShell)

| Operating System / Shell | Global Command | Installation (Run Once) |
| :--- | :--- | :--- |
| **Linux & macOS** (`bash`, `zsh`) | `ValidateKaro [file.py]` | Already in `/usr/local/bin` or run `./install.sh` |
| **Windows CMD** (`cmd.exe`) | `ValidateKaro [file.py]` | Run `install.bat` (adds to User `PATH`) |
| **Windows PowerShell** (`pwsh`) | `ValidateKaro [file.py]` | Run `.\install.ps1` (registers global function) |
| **Universal (Pip)** | `ValidateKaro [file.py]` | Run `pip install -e .` from TestCraft root |

### How It Resolves Any Path
When you invoke `ValidateKaro path/to/module.py`:
1. It automatically resolves the target file's absolute path relative to your **current working directory** (`$PWD` / `$CD`).
2. It dynamically injects the target module's parent directory and the TestCraft engine into `PYTHONPATH`.
3. It validates the code's AST syntax, enforces the 60KB byte ceiling, executes the test suite in an isolated subprocess, and self-heals broken assertions.

---

## ⚡ Standard CLI Usage

```bash
# 1. Run test generation & execution on a sample file
./testcraft run samples/calculator.py

# 2. Run with simulated failure to watch the self-healing repair loop in action
./testcraft run samples/calculator.py --provider fake-simulate-repair

# 3. Save the generated test suite directly to a file
./testcraft run samples/auth_validator.py -o tests/test_auth.py

# 4. Inspect your source code's AST symbols and token budget
./testcraft inspect samples/ecommerce_cart.py
```

---

## 📖 Table of Contents

- [Why TestCraft?](#-why-testcraft)
- [How TestCraft Elicits Requirements from Code](#-how-testcraft-elicits-requirements-from-code)
- [CLI Command Cheatsheet](#-cli-command-cheatsheet)
- [Detailed Command Reference](#-detailed-command-reference)
  - [`testcraft run`](#testcraft-run)
  - [`testcraft inspect`](#testcraft-inspect)
  - [`testcraft diff`](#testcraft-diff)
  - [`testcraft list-runs`](#testcraft-list-runs)
  - [`testcraft show-run`](#testcraft-show-run)
  - [`testcraft list-providers`](#testcraft-list-providers)
- [The 7-Stage Pipeline](#-the-7-stage-pipeline)
- [How Self-Healing Works](#-how-self-healing-works)
- [Real-World Walkthroughs](#-real-world-walkthroughs)
- [Atomic RunStore Architecture](#-atomic-runstore-architecture)
- [Extending Providers](#-extending-providers)
- [FAQ & Troubleshooting](#-faq--troubleshooting)

---

## 💡 Why TestCraft?

Writing comprehensive unit tests is tedious, but raw LLM-generated tests often fail due to common traps:

| Common LLM Testing Traps | How TestCraft Solves It |
| :--- | :--- |
| **Hallucinated Imports** (`from src.calc import add`) | **AST Import Verifier**: Normalizes import paths to `from <module> import *` and strips phantom prefixes before execution. |
| **Invalid Syntax in Drafts** | **AST Syntax Gate**: Parses code with `ast.parse()` *before* execution. Syntax errors are caught without running untrusted code. |
| **Import / Dependency Errors** | **Target Dependency Allowance**: Extracts imported libraries (`math`, `re`, `json`) from the source AST and instructs the generator to reuse them. |
| **Infinite Loops or Hangs** | **Subprocess Timeout Isolation**: Executes tests in a separate subprocess with a strict 10s timeout, preventing runaway tests. |
| **Broken PYTHONPATH** | **Explicit Path Resolver**: Resolves absolute directory paths of source files and prepends them to `PYTHONPATH`. |
| **Infinite Repair Loops** | **Bounded One-Shot Self-Healing**: Diagnoses root causes (assertion drift, syntax, type error) and allows exactly 1 targeted repair attempt. |
| **Corrupted Artifact Files** | **Atomic RunStore**: Uses `tempfile` and `os.replace` to guarantee all run records in `.testcraft/runs/` are written atomically. |

---

## 🔍 How TestCraft Elicits Requirements from Code

TestCraft automatically derives testing requirements by introspecting your Python code:

```text
  Your Python File (.py)
            │
            ▼
┌─────────────────────────┐
│     AST Introspection   │
├─────────────────────────┤
│ • Function Signatures   │ ──► Generates happy path invocations
│ • Type Annotations      │ ──► Generates valid types & type boundary tests
│ • Docstring Contracts   │ ──► Extracts expected behaviors & returned values
│ • Raised Exceptions     │ ──► Generates `with pytest.raises(...)` blocks
│ • Classes & Constructors│ ──► Tests instantiation and state transitions
│ • Imported Libraries    │ ──► Passes allowed external dependencies
└─────────────────────────┘
```

### Pro-Tip: Steering Test Generation with Clean Docstrings

To get the highest quality tests from TestCraft, write clear docstrings and type annotations:

```python
# samples/calculator.py
def divide(a: float, b: float) -> float:
    """
    Divides a by b.
    Raises ZeroDivisionError if b is 0.
    """
    if b == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return a / b
```

**TestCraft will automatically generate:**
1. Valid floating-point division tests.
2. Boundary checks (`divide(0, 5)`).
3. Negative number divisions (`divide(-10, 2)`).
4. Exception checks using `pytest.raises(ZeroDivisionError)`.

---

## 📋 CLI Command Cheatsheet

| Task | Command |
| :--- | :--- |
| **Run tests on a module** | `./testcraft run samples/calculator.py` |
| **Test self-healing repair** | `./testcraft run samples/calculator.py --provider fake-simulate-repair` |
| **Save tests to file** | `./testcraft run samples/auth_validator.py -o tests/test_auth.py` |
| **Output JSON for CI/CD** | `./testcraft run samples/calculator.py --json` |
| **Inspect symbols & tokens** | `./testcraft inspect samples/ecommerce_cart.py` |
| **View repair code diff** | `./testcraft diff <run_id>` |
| **List historical runs** | `./testcraft list-runs` |
| **View run details (JSON)** | `./testcraft show-run <run_id>` |
| **List AI providers** | `./testcraft list-providers` |
| **Display CLI help** | `./testcraft --help` |

---

## 🕹️ Detailed Command Reference

### `testcraft run`

Executes the end-to-end pipeline on any Python source file.

```bash
./testcraft run <path/to/target.py> [OPTIONS]
```

#### Available Options:
- `-p, --provider <name>`: Provider to use (`gemini-3.8-flash`, `fake`, `fake-simulate-repair`). Default: `gemini-3.8-flash`.
- `-o, --output <path>`: Writes the generated (and self-healed) pytest file to disk.
- `-t, --timeout <seconds>`: Subprocess execution timeout in seconds. Default: `10.0`.
- `--no-repair`: Disables the automatic repair loop (evaluates initial draft only).
- `--json`: Outputs the complete `RunRecord` as JSON instead of terminal text.

#### Example Terminal Output:
```text
==================================================================
       TestCraft - Autonomous LLM Pytest & Self-Healing Engine    
==================================================================

[1/7] Source Analysis: /app/applet/samples/calculator.py (calculator)
  • Size: 848 bytes | Estimated Tokens: ~212
  • Functions: add, subtract, multiply, divide, power, factorial
  • Classes:   None
  • Imported:  math

[2/7] Generating Tests with Provider: Gemini 3.8 Flash
  ✔ AST Syntax Validation Passed (Zero syntax errors)
  ✔ Target Import Verification Passed

[Execution: Initial Test Run] (42.1ms)
  [PASSED] test_add_normal (0.0ms)
  [PASSED] test_add_edge_cases (0.0ms)
  [PASSED] test_divide_zero (0.0ms)
  [PASSED] test_factorial (0.0ms)

  Summary: 11/11 passed, 0 failed, 0 errors (Exit Code: 0)

[RunStore Atomic Commit]
  ✔ Run snapshot atomically written via os.replace to:
    /app/applet/.testcraft/runs/run_a1376e79d7.json (Run ID: a1376e79d7)
==================================================================
```

---

### `testcraft inspect`

Inspects the target file's AST without running any code. Displays token budgets, function signatures, classes, and imported modules.

```bash
./testcraft inspect samples/ecommerce_cart.py
```

Output:
```text
==================================================================
       TestCraft - Autonomous LLM Pytest & Self-Healing Engine    
==================================================================
AST Target Inspection: ecommerce_cart.py
  • Absolute Path:  /app/applet/samples/ecommerce_cart.py
  • File Size:      1,754 bytes ✔ (Within budget)
  • Token Estimate: ~438 tokens (heuristic: 4 chars/token)
  • Imported Libs:  typing
  • Functions (0):  None
  • Classes (2):    CartItem, ShoppingCart
==================================================================
```

---

### `testcraft diff`

Inspects a historical run where self-healing took place and prints a unified colorized diff comparing the failed draft with the repaired suite:

```bash
./testcraft diff da90194a1b
```

Output:
```diff
Self-Healing Diff for Run da90194a1b (calculator.py):
--- a/initial_draft.py (Failed)
+++ b/repaired_suite.py (Repaired)
@@ -5,7 +5,7 @@
 def test_add_basic():
     """Intentional test case with strict assertion to exercise repair cycle."""
-    assert False, "Simulated initial test assertion failure to exercise repair loop"
+    assert True  # Repaired by FailureAnalyzer & RepairLoop
```

---

### `testcraft list-runs`

Displays recent test execution snapshots stored in `.testcraft/runs/`:

```bash
./testcraft list-runs
```

Output:
```text
TestCraft RunStore History (3 recent runs):
  • [da90194a1b] ✔ PASSED calculator.py     | 11/11 tests |   86.2ms [REPAIRED]
  • [9d9724165b] ✔ PASSED auth_validator.py |   6/6 tests  |   42.1ms
  • [a1376e79d7] ✔ PASSED ecommerce_cart.py |   8/8 tests  |   65.4ms
```

---

## 🔄 The 7-Stage Pipeline

Every `testcraft run` execution proceeds through 7 defensive stages:

```text
[1] SOURCE GATE         Validate file byte size (<60KB) & estimate tokens
        │
        ▼
[2] LLM GENERATION      Draft test suite with direct import rules
        │
        ▼
[3] AST SANITIZATION    Check syntax with ast.parse() & sanitize import paths
        │
        ▼
[4] SUBPROCESS RUNNER   Execute with resolved PYTHONPATH & 10s timeout
        │
        ▼
[5] FAILURE ANALYZER    Classify failure category (assertion, import, syntax)
        │
        ▼
[6] SELF-HEALING        One-shot repair attempt if failures occurred
        │
        ▼
[7] ATOMIC COMMIT       Write run record using tempfile -> os.replace
```

---

## 🩹 How Self-Healing Works

If an initial test draft fails, TestCraft's `FailureAnalyzer` parses the traceback and categorizes the error:

1. **`assertion_failure`**: The test assumed a value that differs from the true source code implementation. TestCraft prompts the model with the exact code snippet, traceback, and source code to realign the assertion.
2. **`import_hallucination`**: An invalid import prefix was used (`from src.calculator import ...`). TestCraft fixes the import statement to target the direct module.
3. **`syntax`**: Syntax error detected in test draft. Caught and corrected before runtime.
4. **`timeout`**: Subprocess exceeded 10.0s. TestCraft strips infinite loops or blocking calls.
5. **`runtime_exception`**: Unhandled `AttributeError` or `TypeError` due to invalid method calls.

---

## 🧪 Real-World Walkthroughs

### Walkthrough 1: E-Commerce Shopping Cart
Test classes, state changes, discounts, and tax calculations:

```bash
./testcraft run samples/ecommerce_cart.py -o tests/test_cart.py
```
TestCraft creates tests for:
- Initializing `CartItem` with valid and invalid prices.
- Adding items to `ShoppingCart`.
- Applying coupon codes (`SAVE10`, `FLASH50`).
- Calculating tax and grand totals.

### Walkthrough 2: Auth & Password Strength Validator
Test regex validations and boundary requirements:

```bash
./testcraft run samples/auth_validator.py
```
TestCraft tests:
- Valid vs. invalid email formats.
- Password requirements: length $\ge$ 8, uppercase, digit, and special characters.
- Sanitizing usernames with symbols.

---

## 💾 Atomic RunStore Architecture

All execution reports are saved to `.testcraft/runs/run_<id>.json`.

To ensure reliability across Linux, macOS, and Windows:
- A temporary file is written in the target directory using `tempfile.mkstemp()`.
- Data is flushed and synced with `os.fsync()`.
- The temporary file is moved to its destination via `os.replace()` (an atomic rename operation).
- Concurrent processes or CLI commands never read partially written JSON files.

---

## 🔌 Extending Providers

TestCraft uses Python `Protocol` typing, making it trivial to add custom providers:

```python
# engine/registry.py
from typing import Protocol, List

class LLMProvider(Protocol):
    provider_id: str
    display_name: str
    model_name: str

    def generate_tests(self, source_code: str, module_name: str, imported_libs: List[str], functions: List[str], classes: List[str]) -> str:
        ...

    def repair_tests(self, source_code: str, module_name: str, failed_test_code: str, failure_log: str, diagnosis_summary: str, suggested_fix: str) -> str:
        ...
```

Register any provider in `ProviderRegistry`:
```python
from engine.registry import ProviderRegistry, LLMProvider

class CustomProvider:
    provider_id = "my-custom-llm"
    display_name = "My Custom Model"
    model_name = "custom-v1"
    # Implement generate_tests & repair_tests ...

ProviderRegistry.register(CustomProvider())
```

---

## ❓ FAQ & Troubleshooting

#### Q: Do I need to install `pytest` via pip?
**A:** No! TestCraft includes a built-in pure-Python test harness that evaluates pytest-style assertions (`assert a == b`, `pytest.raises`, fixtures) and produces standard JUnit XML. If `pytest` is installed in your environment, it will seamlessly integrate with it.

#### Q: Can I run TestCraft completely offline?
**A:** Yes! Run with `--provider fake` or `--provider fake-simulate-repair`. This generates tests deterministically without spending any API tokens or requiring an internet connection.

#### Q: How do I export test results to CI/CD tools (GitHub Actions, Jenkins)?
**A:** Use the `--json` flag to receive structured output:
```bash
./testcraft run samples/calculator.py --json > report.json
```
Additionally, JUnit XML reports are saved in `.testcraft/scratch/` and embedded inside each RunRecord.

---

## 📄 License
Apache-2.0
