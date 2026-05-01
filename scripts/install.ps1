$ErrorActionPreference = "Stop"

$owner = "LetPeopleWork"
$repo = "lighthouse-clients"
$installDir = "$env:LOCALAPPDATA\Programs\lh"
$asset = "lh-windows-x64.zip"

# LH_VERSION: pin an exact release (e.g. "0.12.0").  Unset = use latest.
if ($env:LH_VERSION) {
    $url = "https://github.com/$owner/$repo/releases/download/v$env:LH_VERSION/$asset"
} else {
    $url = "https://github.com/$owner/$repo/releases/latest/download/$asset"
}

$tmp = New-TemporaryFile | ForEach-Object { $_.FullName + ".zip" }

Write-Host "Downloading $url ..."
Invoke-WebRequest -Uri $url -OutFile $tmp

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Expand-Archive -Path $tmp -DestinationPath $installDir -Force
Remove-Item $tmp

# Add to user PATH if not already there
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$installDir", "User")
    Write-Host "Added $installDir to PATH (restart your terminal)"
}

Write-Host "✓ Installed lh to $installDir\lh.exe"

# --- Emit install dir for CI capture ---
# When running inside GitHub Actions, write install_dir to $env:GITHUB_OUTPUT so
# subsequent steps can add it to PATH without string-parsing this script's output.
if ($env:GITHUB_OUTPUT) {
    Add-Content -Path $env:GITHUB_OUTPUT -Value "install_dir=$installDir"
}

Write-Host "To uninstall: irm https://github.com/$owner/$repo/releases/latest/download/uninstall.ps1 | iex"