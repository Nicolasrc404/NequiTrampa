<#
.SYNOPSIS
    Smoke test para verificar la proyeccion de eventos hacia Cloud Firestore
    a traves del endpoint real POST /internal/pubsub/projection de Nequi.Workers.

.DESCRIPTION
    IMPORTANTE:
    - Esta prueba NO es una operacion financiera real.
    - NO modifica Cloud Spanner.
    - NO representa dinero autoritativo (Spanner es la unica fuente de verdad).
    - El evento enviado es SINTETICO y sirve exclusivamente para validar la cadena:
      DomainEvent -> PushEnvelope -> ProjectionService -> FirestoreDocumentStore -> financial_movements.
    - El endpoint /internal/pubsub/projection recibe el push envelope estandar de Pub/Sub
      y proyecta el evento de forma idempotente (documentId = eventId).

.PARAMETER WorkersBaseUrl
    URL base del servicio Nequi.Workers. Default: "http://localhost:8080".

.PARAMETER EventId
    Identificador unico del evento. Si no se suministra, se genera uno automatico.
    Para probar IDEMPOTENCIA, suministre el mismo EventId en dos ejecuciones consecutivas.

.PARAMETER AuthToken
    Token Bearer opcional. Si Workers corre en Cloud Run y requiere autenticacion IAM OIDC,
    pase el token obtenido mediante 'gcloud auth print-identity-token'. En desarrollo local no es necesario.

.EXAMPLE
    # Primera ejecucion (crea el documento):
    .\scripts\firestore-projection-smoke.ps1 -EventId "smoke-firestore-001"

    # Segunda ejecucion con el mismo EventId (debe ser idempotente, no duplica):
    .\scripts\firestore-projection-smoke.ps1 -EventId "smoke-firestore-001"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$WorkersBaseUrl = "http://localhost:8080",

    [Parameter(Mandatory = $false)]
    [string]$EventId = "",

    [Parameter(Mandatory = $false)]
    [string]$AuthToken = ""
)

Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host " NEQUI - FIRESTORE PROJECTION SMOKE TEST" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host " ADVERTENCIA:" -ForegroundColor Red
Write-Host " - Este evento es SINTETICO." -ForegroundColor Red
Write-Host " - NO es una operacion financiera real." -ForegroundColor Red
Write-Host " - NO modifica Cloud Spanner (fuente autoritativa de saldos)." -ForegroundColor Red
Write-Host " - Destino: Coleccion 'financial_movements' en Firestore." -ForegroundColor Red
Write-Host "==============================================================" -ForegroundColor Yellow

# 1. Determinar o generar EventId (reutilizable para pruebas de idempotencia)
if ([string]::IsNullOrWhiteSpace($EventId)) {
    $EventId = "smoke-firestore-" + (Get-Date -Format "yyyyMMddHHmmss")
    Write-Host "[INFO] EventId no especificado. Generado aleatorio: $EventId" -ForegroundColor Cyan
} else {
    Write-Host "[INFO] Utilizando EventId especificado: $EventId" -ForegroundColor Green
}

# 2. Construir el payload del DomainEvent sintetico segun contrato DomainEvent.cs
$occurredAtUtc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# NOTA: DomainEvent usa JsonSerializerDefaults.Web (camelCase) y DefaultIgnoreCondition = WhenWritingNull.
# CounterpartyClientId es null, por lo que se omite del JSON.
$domainEventObj = [ordered]@{
    eventId           = $EventId
    eventType         = "RECHARGE_COMPLETED"
    operationId       = "smoke-operation-firestore"
    clientId          = "11111111-1111-4111-8111-111111111111"
    occurredAt        = $occurredAtUtc
    amountCents       = 100
    currency          = "COP"
    description       = "FIRESTORE_SMOKE_TEST"
    balanceAfterCents = 40000100
}

# 3. Serializar DomainEvent a JSON UTF-8
$domainEventJson = $domainEventObj | ConvertTo-Json -Compress
Write-Host "`n[1/4] DomainEvent JSON construido:" -ForegroundColor DarkGray
Write-Host $domainEventJson -ForegroundColor DarkGray

# 4. Codificar JSON UTF-8 a Base64
$bytes = [System.Text.Encoding]::UTF8.GetBytes($domainEventJson)
$base64Data = [System.Convert]::ToBase64String($bytes)
Write-Host "`n[2/4] Payload codificado en Base64:" -ForegroundColor DarkGray
Write-Host $base64Data -ForegroundColor DarkGray

# 5. Construir PushEnvelope exacto esperado por PushEnvelope.TryReadEvent
# Contrato: {"message": {"data": "<base64>", "messageId": "..."}, "subscription": "..."}
$envelopeObj = [ordered]@{
    message = [ordered]@{
        data      = $base64Data
        messageId = "smoke-msg-" + [System.Guid]::NewGuid().ToString("N")[0..7] -join ""
    }
    subscription = "projects/full-stack-2026/subscriptions/workers-projection-smoke"
}

$envelopeJson = $envelopeObj | ConvertTo-Json -Compress
Write-Host "`n[3/4] PushEnvelope construido:" -ForegroundColor DarkGray
Write-Host $envelopeJson -ForegroundColor DarkGray

# 6. Preparar llamada HTTP POST a /internal/pubsub/projection
$targetUrl = "$($WorkersBaseUrl.TrimEnd('/'))/internal/pubsub/projection"
Write-Host "`n[4/4] Enviando POST a: $targetUrl" -ForegroundColor Cyan

$headers = @{
    "Content-Type" = "application/json"
}

if (-not [string]::IsNullOrWhiteSpace($AuthToken)) {
    $headers["Authorization"] = "Bearer $AuthToken"
    Write-Host "[INFO] Header Authorization (Bearer) adjuntado." -ForegroundColor DarkGray
}

try {
    $response = Invoke-WebRequest -Uri $targetUrl `
                                  -Method Post `
                                  -Headers $headers `
                                  -Body $envelopeJson `
                                  -UseBasicParsing `
                                  -ErrorAction Stop

    $statusCode = [int]$response.StatusCode
    Write-Host "`n>>> RESPUESTA RECIBIDA <<<" -ForegroundColor Green
    Write-Host "Status Code : $statusCode ($($response.StatusDescription))" -ForegroundColor Green
    Write-Host "EventId     : $EventId" -ForegroundColor Cyan
    Write-Host "Content     : $($response.Content)" -ForegroundColor DarkGray

    if ($statusCode -eq 204) {
        Write-Host "`n[EXITO] HTTP 204 No Content recibido." -ForegroundColor Green
        Write-Host "El evento fue procesado por ProjectionService." -ForegroundColor Green
        Write-Host "Verifique en Firebase Console -> Firestore -> Coleccion 'financial_movements' -> Documento '$EventId'." -ForegroundColor Yellow
    } elseif ($statusCode -eq 202) {
        Write-Host "`n[ADVERTENCIA] HTTP 202 Accepted recibido. El mensaje fue descartado o malformado." -ForegroundColor Red
    } else {
        Write-Host "`n[INFO] Codigo de respuesta inesperado: $statusCode" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "`n>>> ERROR EN LA LLAMADA HTTP <<<" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errResponse = $_.Exception.Response
        $errStatusCode = [int]$errResponse.StatusCode
        Write-Host "Status Code : $errStatusCode" -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($errResponse.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "Error Body  : $errBody" -ForegroundColor Red
    } else {
        Write-Host "Excepcion   : $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host "EventId intentado : $EventId" -ForegroundColor Yellow
    exit 1
}
