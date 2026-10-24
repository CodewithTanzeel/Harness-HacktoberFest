<#
.SYNOPSIS
    ValidateKaro - Global PowerShell Command
    Executes TestCraft validation harness on any path regardless of directory.

.EXAMPLE
    ValidateKaro
    ValidateKaro C:\path\to\module.py
    ValidateKaro .\my_script.py
#>

[CmdletBinding()]
param(
    [Parameter(Position=0, Mandatory=$false)]
    [string]$Target
)

$ErrorActionPreference = "Stop"
$TestcraftHome = Split-Path -Parent $MyInvocation.MyCommand.Path

# Ensure engine home and caller's current working directory are on PYTHONPATH
$CallerDir = (Get-Location).Path
$env:PYTHONPATH = "$TestcraftHome;$CallerDir;$env:PYTHONPATH"

$CliScript = Join-Path $TestcraftHome "engine" "cli.py"

# Resolve target path relative to current directory if specified
$ResolvedTarget = $null
if ($Target) {
    if ([System.IO.Path]::IsPathRooted($Target)) {
        $ResolvedTarget = $Target
    } else {
        $ResolvedTarget = Join-Path $CallerDir $Target
    }
}

try {
    if ($ResolvedTarget) {
        python $CliScript validatekaro $ResolvedTarget
    } else {
        python $CliScript validatekaro
    }
    exit $LASTEXITCODE
} catch {
    Write-Error "ValidateKaro execution failed: $_"
    exit 1
}
