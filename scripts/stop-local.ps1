# Detiene los servicios levantados por scripts/run-local.ps1.
$pidFile = Join-Path (Split-Path $PSScriptRoot -Parent) '.local-run\pids.txt'
if (-not (Test-Path $pidFile)) { Write-Host 'No hay servicios corriendo.'; return }
foreach ($id in Get-Content $pidFile) {
    try { Stop-Process -Id $id -Force -ErrorAction Stop } catch {}
}
Remove-Item $pidFile
Write-Host 'Servicios detenidos.'
