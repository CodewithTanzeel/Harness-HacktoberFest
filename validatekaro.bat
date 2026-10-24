@echo off
REM ==============================================================================
REM TestCraft - Quick Start Validation Harness (Windows Command Prompt - cmd.exe)
REM ==============================================================================

SETLOCAL EnableDelayedExpansion
SET "SCRIPT_DIR=%~dp0"
SET "PYTHONPATH=%SCRIPT_DIR%;%PYTHONPATH%"

python "%SCRIPT_DIR%engine\cli.py" validatekaro %*
IF ERRORLEVEL 1 (
    echo [ERROR] validatekaro failed with exit code %ERRORLEVEL%
    EXIT /B %ERRORLEVEL%
)
EXIT /B 0
