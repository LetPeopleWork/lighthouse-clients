# uninstall.ps1
$ErrorActionPreference = "Stop"

$binary = "lh.exe"

$candidates = @(
    "$env:LOCALAPPDATA\Programs\lh\$binary",
    "$env:ProgramFiles\lh\$binary",
    "$env:ProgramFiles(x86)\lh\$binary"
)

# Also check PATH
$inPath = Get-Command lh -ErrorAction SilentlyContinue
if ($inPath) {
    $candidates += $inPath.Source
}

# Deduplicate
$candidates = $candidates | Sort-Object -Unique

$found = @()
foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
        $found += $candidate
    }
}

if ($found.Count -eq 0) {
    Write-Host "lh not found in any known location. Nothing to uninstall."
    exit 0
}

foreach ($path in $found) {
    $dir = Split-Path $path -Parent
    Write-Host "Removing $path ..."
    Remove-Item -Force $path
    Write-Host "✓ Removed $path"

    # Remove parent dir if empty
    if ((Get-ChildItem $dir -ErrorAction SilentlyContinue).Count -eq 0) {
        Remove-Item -Force -Recurse $dir
        Write-Host "✓ Removed empty directory $dir"
    }

    # Remove from user PATH if present
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($currentPath -like "*$dir*") {
        $newPath = ($currentPath -split ";" | Where-Object { $_ -ne $dir }) -join ";"
        [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
        Write-Host "✓ Removed $dir from PATH (restart your terminal)"
    }
}

Write-Host ""
Write-Host "lh has been uninstalled."