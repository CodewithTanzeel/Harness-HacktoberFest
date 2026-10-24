<#
.SYNOPSIS
    Global Installer for Windows PowerShell
    Adds TestCraft to User PATH and creates global ValidateKaro function.

.EXAMPLE
    .\install.ps1
#>

$ErrorActionPreference = "Stop"
$InstallDir = $PSScriptRoot

Write-Host "Installing ValidateKaro to Windows User PATH..." -ForegroundColor Cyan
Write-Host "Directory: $InstallDir" -ForegroundColor Gray

# Retrieve current user PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::User)
if ($CurrentPath -notlike "*$InstallDir*") {
    $NewPath = "$CurrentPath;$InstallDir"
    [Environment]::SetEnvironmentVariable("PATH", $NewPath, [EnvironmentVariableTarget]::User)
    $env:PATH = "$env:PATH;$InstallDir"
    Write-Host "[OK] Added $InstallDir to User Environment PATH." -ForegroundColor Green
} else {
    Write-Host "[INFO] Directory is already in your User PATH." -ForegroundColor Yellow
}

# Optional: Register global function in current PowerShell session
Set-Alias -Name ValidateKaro -Value "$InstallDir\ValidateKaro.ps1" -Scope Global -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host " [SUCCESS] ValidateKaro is now globally accessible across Windows!" -ForegroundColor Green
Write-Host " You can open PowerShell in ANY directory on your computer and run:" -ForegroundColor White
Write-Host "     cd C:\any\directory" -ForegroundColor Yellow
Write-Host "     ValidateKaro" -ForegroundColor Yellow
Write-Host "     ValidateKaro .\my_module.py" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Green
