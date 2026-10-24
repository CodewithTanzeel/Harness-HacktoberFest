<#
.SYNOPSIS
    TestCraft Quick Start Harness for Windows PowerShell

.DESCRIPTION
    Runs the complete TestCraft validation harness across Python runtime,
    AST gate, subprocess runner, self-healing loop, and atomic RunStore.

.EXAMPLE
    .\validatekaro.ps1
    .\validatekaro.ps1 samples\calculator.py
#>

[CmdletBinding()]
param(
    [Parameter(Position=0, Mandatory=$false)]
    [string]$Target
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set PYTHONPATH environment variable for child processes
$env:PYTHONPATH = "$ScriptDir;$env:PYTHONPATH"

$CliScript = Join-Path $ScriptDir "engine" "cli.py"

try {
    if ($Target) {
        python $CliScript validatekaro $Target
    } else {
        python $CliScript validatekaro
    }
    exit $LASTEXITCODE
} catch {
    Write-Error "validatekaro execution failed: $_"
    exit 1
}
