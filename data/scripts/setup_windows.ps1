# One-time setup for data/ on Windows (PowerShell). Run from the data\ folder:
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup_windows.ps1
$ErrorActionPreference = "Stop"

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
  Write-Error "Python launcher 'py' not found. Install Python 3.12 from python.org (tick 'Add to PATH')."
}
py -3.12 --version

if (-not (Test-Path .venv)) { py -3.12 -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -e ".[all,dev]"

New-Item -ItemType Directory -Force raw, out, cache | Out-Null

if (-not (Test-Path ..\.env)) {
  Copy-Item ..\.env.example ..\.env
  Write-Host "Created ..\.env from .env.example - fill in CDSE_CLIENT_ID / CDSE_CLIENT_SECRET when you have them."
}

& .\.venv\Scripts\python.exe -m pytest

if (-not (Get-Command pmtiles -ErrorAction SilentlyContinue)) {
  Write-Host "`nNext: install the pmtiles CLI (D18) from https://github.com/protomaps/go-pmtiles/releases and add it to PATH."
}
Write-Host "`nNext: download https://download.geofabrik.de/europe/finland-latest-free.shp.zip into data\raw\"
Write-Host "Then: .venv\Scripts\activate ; picky-data area"
