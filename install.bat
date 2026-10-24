@echo off
REM ==============================================================================
REM TestCraft - Global Installer for Windows Command Prompt (cmd.exe)
REM Adds TestCraft directory to user PATH so ValidateKaro runs from ANY folder.
REM ==============================================================================

SETLOCAL EnableDelayedExpansion
SET "INSTALL_DIR=%~dp0"
REM Strip trailing backslash
IF "%INSTALL_DIR:~-1%"=="\" SET "INSTALL_DIR=%INSTALL_DIR:~0,-1%"

echo Installing ValidateKaro to Windows User PATH...
echo Directory: %INSTALL_DIR%

REM Check if already in PATH
echo %PATH% | find /I "%INSTALL_DIR%" >nul
IF %ERRORLEVEL% EQU 0 (
    echo [INFO] %INSTALL_DIR% is already in your PATH!
) ELSE (
    setx PATH "%PATH%;%INSTALL_DIR%"
    echo [OK] Added %INSTALL_DIR% to user environment PATH.
)

echo.
echo ==============================================================================
echo [SUCCESS] ValidateKaro is now globally accessible!
echo Open a new Command Prompt window and run from ANY directory:
echo     cd C:\any\project\folder
echo     ValidateKaro
echo     ValidateKaro my_file.py
echo ==============================================================================
pause
