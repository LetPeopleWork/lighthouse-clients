$ErrorActionPreference = "Stop"

$owner = "LetPeopleWork"
$repo = "lighthouse-clients"
$installDir = "$env:LOCALAPPDATA\Programs\lh"
$asset = "lh-windows-x64.zip"
$url = "https://github.com/$owner/$repo/releases/latest/download/$asset"

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
Write-Host "To uninstall: irm https://github.com/$owner/$repo/releases/latest/download/uninstall.ps1 | iex"