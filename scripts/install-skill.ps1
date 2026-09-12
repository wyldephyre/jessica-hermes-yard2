# Install yard2-desk into Cap's live JessicaHermes tree.
# Not ~/.hermes — that is stock Hermes, not Cap's live tree.
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$src = Join-Path $repoRoot "hermes\skills\yard2-desk"
$dest = "D:\TheForge\JessicaHermes\skills\software-development\yard2-desk"

if (-not (Test-Path (Join-Path $src "SKILL.md"))) {
    throw "Missing source SKILL.md at $src"
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Recurse -Force (Join-Path $src "*") $dest

$copied = Join-Path $dest "SKILL.md"
if (-not (Test-Path $copied)) {
    throw "Copy failed: SKILL.md missing at $copied"
}

Write-Host "Installed yard2-desk -> $dest"
Write-Host "In Hermes Desktop: /reload-skills then ask Use yard2-desk: home"
