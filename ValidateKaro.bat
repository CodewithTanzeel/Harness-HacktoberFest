@echo off
REM ==============================================================================
REM ValidateKaro - Global Terminal Command (Windows Command Prompt - cmd.exe)
REM Can be executed from ANY path or directory on the computer.
REM ==============================================================================

SETLOCAL EnableDelayedExpansion
SET "TESTCRAFT_HOME=%~dp0"
SET "PYTHONPATH=%TESTCRAFT_HOME%;%CD%;%PYTHONPATH%"

python "%TESTCRAFT_HOME%engine\cli.py" validatekaro %*
IF ERRORLEVEL 1 (
    EXIT /B %ERRORLEVEL%
)
EXIT /B 0
