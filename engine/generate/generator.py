"""
TestCraft Engine - Test Suite Generator
Constructs prompts with strict import rules and library allowances,
calls the selected LLMProvider, and performs AST syntax and import checks on the draft.
"""

from typing import Tuple, Optional
from engine.models import TargetModule, SyntaxCheckResult, ImportVerificationResult
from engine.registry import LLMProvider
from engine.generate.parser import (
    strip_markdown_fences,
    parse_syntax,
    verify_target_import,
    sanitize_and_fix_imports
)

class TestGenerator:
    """Orchestrates test generation using an LLMProvider and validates resulting code drafts."""

    @staticmethod
    def build_generation_prompt(target: TargetModule) -> str:
        imported_notice = ""
        if target.imported_libs:
            libs_str = ", ".join(target.imported_libs)
            imported_notice = f"\nNOTE: You may use standard library modules, pytest, and any libraries already imported in the source module: [{libs_str}]."
        else:
            imported_notice = "\nNOTE: Use only pytest and the standard library."

        expected_import = f"from {target.module_name} import *"

        prompt = f"""You are an autonomous Python testing expert.
Generate a comprehensive, robust pytest test suite for the following Python module '{target.module_name}'.

CRITICAL IMPORT RULES:
- The target module is named '{target.module_name}'.
- You MUST import the target module directly like:
  {expected_import}
  OR:
  import {target.module_name}
- DO NOT hallucinate nonexistent directories or package prefixes (e.g. DO NOT write 'from src.{target.module_name} import ...' or 'from app.{target.module_name} import ...').
{imported_notice}

TESTING GUIDELINES:
- Write clear, independent test functions starting with `test_`.
- Test happy paths, edge cases, boundaries (e.g. 0, negative numbers, empty lists/strings, None).
- Test expected exceptions using `with pytest.raises(...)`.
- Include parameterization where appropriate using `@pytest.mark.parametrize` or parameterized test cases.
- Do NOT include any explanations, Markdown commentary, or instructions. Return ONLY the executable Python code.

SOURCE MODULE UNDER TEST ({target.filename}):
```python
{target.code}
```
"""
        return prompt

    @staticmethod
    def build_repair_prompt(
        target: TargetModule,
        failed_test_code: str,
        diagnosis_summary: str,
        suggested_fix: str,
        failure_log: str
    ) -> str:
        prompt = f"""You are an autonomous Python testing expert repairing a failed pytest suite.

TARGET SOURCE CODE ({target.module_name}):
```python
{target.code}
```

FAILED TEST SUITE:
```python
{failed_test_code}
```

FAILURE DIAGNOSIS:
{diagnosis_summary}

SUGGESTED FIX:
{suggested_fix}

RUNNER TRACEBACK & ERROR LOG:
```
{failure_log[-1200:]}
```

REPAIR INSTRUCTIONS:
- Fix the test suite so all tests pass cleanly.
- Align assertions with the TRUE implementation of {target.module_name}.
- Keep valid tests that passed; repair or adjust only the failing assertions or import statements.
- The target import MUST be `from {target.module_name} import *` or `import {target.module_name}`.
- Return ONLY the complete, corrected Python test suite code. No markdown commentary.
"""
        return prompt

    @classmethod
    def generate(cls, provider: LLMProvider, target: TargetModule) -> Tuple[str, SyntaxCheckResult, ImportVerificationResult]:
        """Invokes provider to generate test draft, then parses and validates AST and imports."""
        raw_code = provider.generate_tests(
            source_code=target.code,
            module_name=target.module_name,
            imported_libs=target.imported_libs,
            functions=target.functions,
            classes=target.classes
        )

        # Sanitize common import hallucinations if any
        sanitized = sanitize_and_fix_imports(raw_code, target.module_name)
        
        # Check syntax
        syntax_res = parse_syntax(sanitized)
        
        # Check target import
        import_res = verify_target_import(sanitized, target.module_name)

        return sanitized, syntax_res, import_res
