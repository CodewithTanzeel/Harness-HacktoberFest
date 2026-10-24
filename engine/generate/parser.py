"""
TestCraft Engine - AST Parser & Import Sanitizer
Validates syntax trees, inspects imported libraries, and detects/fixes
hallucinated import paths before tests ever reach execution.
"""

import ast
import re
from typing import List, Tuple, Set
from engine.models import SyntaxCheckResult, ImportVerificationResult

def strip_markdown_fences(raw_text: str) -> str:
    """Extracts raw Python code if the LLM wrapped it in markdown code blocks."""
    text = raw_text.strip()
    
    # Match ```python ... ``` or ``` ... ```
    pattern = r"```(?:python)?\s*([\s\S]*?)\s*```"
    matches = re.findall(pattern, text, re.IGNORECASE)
    if matches:
        # Take the largest code block
        return max(matches, key=len).strip()
    
    # If starting with ``` or ending with ```
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) > 1:
            first_line = lines[0].strip()
            if first_line.startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            return "\n".join(lines).strip()
            
    return text

def parse_syntax(code: str) -> SyntaxCheckResult:
    """Validates Python syntax using the AST without executing code."""
    try:
        ast.parse(code)
        return SyntaxCheckResult(is_valid=True)
    except SyntaxError as e:
        return SyntaxCheckResult(
            is_valid=False,
            error_message=f"{e.msg} at line {e.lineno}, offset {e.offset}",
            lineno=e.lineno,
            offset=e.offset
        )
    except Exception as e:
        return SyntaxCheckResult(is_valid=False, error_message=str(e))

def extract_module_symbols(code: str) -> Tuple[List[str], List[str], List[str]]:
    """
    Extracts (imported_libraries, function_names, class_names) from Python source.
    """
    imported_libs: Set[str] = set()
    functions: List[str] = []
    classes: List[str] = []
    
    try:
        tree = ast.parse(code)
    except Exception:
        return [], [], []
        
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported_libs.add(alias.name.split('.')[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imported_libs.add(node.module.split('.')[0])
        elif isinstance(node, ast.FunctionDef) or isinstance(node, getattr(ast, 'AsyncFunctionDef', ())):
            # Only top-level or main functions
            functions.append(node.name)
        elif isinstance(node, ast.ClassDef):
            classes.append(node.name)
            
    return sorted(list(imported_libs)), functions, classes

def verify_target_import(test_code: str, module_name: str) -> ImportVerificationResult:
    """
    Inspects imports in generated test code.
    Checks whether target module (or symbols from it) is imported properly,
    or if the LLM hallucinated an invalid prefix like 'from src.<module> import ...'
    when target module is simply '<module>'.
    """
    try:
        tree = ast.parse(test_code)
    except SyntaxError:
        return ImportVerificationResult(
            is_valid=False,
            expected_import=f"import {module_name} OR from {module_name} import ...",
            found_imports=[],
            target_imported=False,
            error_message="SyntaxError in test code, cannot parse imports."
        )

    found_imports: List[str] = []
    target_imported = False

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                found_imports.append(f"import {alias.name}")
                if alias.name == module_name or alias.name.endswith(f".{module_name}"):
                    target_imported = True
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            names = ", ".join(a.name for a in node.names)
            found_imports.append(f"from {mod} import {names}")
            if mod == module_name or mod.endswith(f".{module_name}"):
                target_imported = True

    is_valid = target_imported

    error_msg = None
    if not target_imported:
        error_msg = f"Hallucinated or missing import: Target module '{module_name}' was not imported correctly. Found imports: {found_imports}"

    return ImportVerificationResult(
        is_valid=is_valid,
        expected_import=f"from {module_name} import * or import {module_name}",
        found_imports=found_imports,
        target_imported=target_imported,
        error_message=error_msg
    )

def sanitize_and_fix_imports(test_code: str, module_name: str) -> str:
    """
    Automatically detects common hallucination patterns:
    e.g. 'from src.<module_name> import ...' or 'from app.<module_name> import ...'
    and rewrites them to 'from <module_name> import ...'
    """
    code = strip_markdown_fences(test_code)
    
    # Replace hallucinated prefixes e.g. "from src.calculator import" -> "from calculator import"
    hallucination_pattern = re.compile(rf"from\s+(?:src|app|tests?|modules)\.{re.escape(module_name)}\s+import", re.IGNORECASE)
    code = hallucination_pattern.sub(f"from {module_name} import", code)

    hallucination_import = re.compile(rf"import\s+(?:src|app|tests?|modules)\.{re.escape(module_name)}\b", re.IGNORECASE)
    code = hallucination_import.sub(f"import {module_name}", code)

    return code
