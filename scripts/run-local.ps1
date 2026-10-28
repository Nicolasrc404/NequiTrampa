<#
.SYNOPSIS
  Levanta los 7 servicios de NequiTrampa en esta máquina, con Swagger en cada uno.

.DESCRIPTION
  -Backend gcp    (default) Wallet escribe en Cloud Spanner real, idempotencia en Spanner, lecturas en Firestore
                  y Workers verifica Pub/Sub. Requiere ADC:  gcloud auth application-default login
  -Backend memory Todo en memoria, sin credenciales.

  El OutboxWorker local queda apagado (Outbox__Enabled=false): el outbox no tiene lease/claim y el Workers
  desplegado en Cloud Run ya lo drena; dos drenadores publicarían eventos duplicados.

  Auth: headers demo activos (X-Demo-User / X-Demo-Role), úsalos desde el botón "Authorize" de Swagger.
  Solo para entornos no productivos.

.EXAMPLE
  .\scripts\run-local.ps1                 # GCP (full-stack-2026)
  .\scripts\run-local.ps1 -Backend memory # sin GCP
  .\scripts\run-local.ps1 -Lan            # además accesible desde otros equipos de la red
  .\scripts\stop-local.ps1
#>
param(
    [ValidateSet('gcp', 'memory')] [string] $Backend = 'gcp',
    [switch] $Lan,
    [string] $ProjectId = 'full-stack-2026',
    [string] $FirestoreProjectId = 'fullstack-d3be5',
    [string] $SpannerDatabase = 'projects/full-stack-2026/instances/finanzas-mvp/databases/finanzas-core',
    [string] $Topic = 'wallet-events'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$runDir = Join-Path $root '.local-run'
$pidFile = Join-Path $runDir 'pids.txt'

$services = [ordered]@{
    Wallet     = 8080   # mismo puerto que tests/bruno/environments/local.bru
    Profile    = 8081
    Finance    = 8082
    Backoffice = 8083
    Assistant  = 8084
    Workers    = 8085
    Realtime   = 8086
}

if (Test-Path $pidFile) { & (Join-Path $PSScriptRoot 'stop-local.ps1') }
New-Item -ItemType Directory -Force $runDir | Out-Null

if ($Backend -eq 'gcp') {
    & gcloud auth application-default print-access-token *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "No hay Application Default Credentials. Ejecuta: gcloud auth application-default login"
    }
}

Write-Host "Compilando..." -ForegroundColor Cyan
& dotnet build (Join-Path $root 'Nequi.slnx') -c Debug --nologo -v q
if ($LASTEXITCODE -ne 0) { Write-Error 'La compilación falló' }

$hostName = if ($Lan) { '0.0.0.0' } else { 'localhost' }
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:Auth__DemoHeaders = 'true'
$env:Swagger__Enabled = 'true'
$env:Outbox__Enabled = 'false'
$env:Data__Backend = $Backend
if ($Backend -eq 'gcp') {
    $env:Gcp__ProjectId = $ProjectId
    $env:Firestore__ProjectId = $FirestoreProjectId
    $env:Spanner__Database = $SpannerDatabase
    $env:PubSub__OutboxTopic = $Topic
} else {
    $env:Gcp__ProjectId = 'local'
    $env:Firestore__ProjectId = 'local'
    $env:Spanner__Database = ''
}

$pids = @()
foreach ($name in $services.Keys) {
    $port = $services[$name]
    $bin = Join-Path $root "src\Nequi.$name\bin\Debug\net10.0"
    $env:ASPNETCORE_URLS = "http://${hostName}:$port"
    $p = Start-Process dotnet -ArgumentList "Nequi.$name.dll" -WorkingDirectory $bin -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runDir "$name.log") -RedirectStandardError (Join-Path $runDir "$name.err.log")
    $pids += $p.Id
}
$pids | Set-Content $pidFile
Remove-Item Env:ASPNETCORE_URLS

Write-Host "Esperando a que arranquen..." -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(60)
$rows = foreach ($name in $services.Keys) {
    $port = $services[$name]
    $live = $null
    while (-not $live -and (Get-Date) -lt $deadline) {
        try { $live = (Invoke-WebRequest "http://localhost:$port/health/live" -UseBasicParsing -TimeoutSec 2).StatusCode } catch { Start-Sleep -Milliseconds 500 }
    }
    $ready = try { (Invoke-WebRequest "http://localhost:$port/health/ready" -UseBasicParsing -TimeoutSec 15).Content } catch {
        # 503 = alguna dependencia caída; PowerShell 5.1 no expone el cuerpo en ErrorDetails
        $resp = $_.Exception.Response
        if ($resp) { (New-Object IO.StreamReader($resp.GetResponseStream())).ReadToEnd() } else { $_.Exception.Message }
    }
    [pscustomobject]@{ Servicio = $name; Swagger = "http://localhost:$port/swagger"; Live = $(if ($live) { 'OK' } else { 'FALLA' }); Ready = $ready }
}
$rows | Format-Table -AutoSize

if ($Lan) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -in 'Dhcp', 'Manual' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress
    Write-Host "Desde otros equipos: http://${ip}:<puerto>/swagger  (el firewall de Windows debe permitir los puertos 8080-8086)" -ForegroundColor Yellow
}
Write-Host "Backend: $Backend. Logs en .local-run\. Para detener: .\scripts\stop-local.ps1" -ForegroundColor Green
