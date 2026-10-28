#!/usr/bin/env bash
# Crea/actualiza los usuarios de prueba en Identity Platform con custom claims (roles + client_id).
# Los uid de los clientes coinciden con clients.auth_subject en Spanner, por lo que Wallet/Profile/Assistant los resuelven sin cambios.
# Usage: SEED_PASSWORD='<min 8 chars>' ./infra/seed-identity.sh
# Imprime la API key web (publica) que usan Postman/Bruno para iniciar sesion; la contrasena nunca se guarda en el repo.
source "$(dirname "$0")/common.sh"
: "${SEED_PASSWORD:?Define SEED_PASSWORD (minimo 8 caracteres) para los usuarios de prueba}"
DOMAIN="${SEED_EMAIL_DOMAIN:-demo.co}"   # igual que clients.email / administrators.email en Spanner
TOKEN="$(gcloud auth print-access-token)"

api() { # $1=suffix (":lookup", ":update" o "") $2=json body
  curl -sS -X POST "https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts$1" \
    -H "Authorization: Bearer ${TOKEN}" -H "x-goog-user-project: ${PROJECT_ID}" -H "Content-Type: application/json" -d "$2"
}

upsert() { # $1=uid $2=email-local-part $3=roles-json-array $4=client_id (optional)
  local uid="$1" email="$2@${DOMAIN}" roles="$3" client="${4:-}" claims
  claims="{\"roles\":${roles}"
  [ -n "$client" ] && claims="${claims},\"client_id\":\"${client}\""
  claims="${claims}}"
  local escaped="${claims//\"/\\\"}"
  local body="{\"localId\":\"${uid}\",\"email\":\"${email}\",\"password\":\"${SEED_PASSWORD}\",\"emailVerified\":true,\"customAttributes\":\"${escaped}\"}"
  local verb="actualizado"
  if ! api ":lookup" "{\"localId\":[\"${uid}\"]}" | grep -q '"users"'; then
    api "" "$body" | grep -q '"error"' && { echo "FALLO create ${uid}"; return 1; }
    verb="creado     "
  fi
  # La creacion ignora customAttributes: se aplican siempre con :update (idempotente).
  api ":update" "$body" | grep -q '"error"' && { echo "FALLO update ${uid}"; return 1; }
  api ":lookup" "{\"localId\":[\"${uid}\"]}" | grep -q 'customAttributes' || { echo "FALLO claims ${uid}"; return 1; }
  echo "${verb} ${uid} <${email}> ${claims}"
}

# Clientes (uid = clients.auth_subject; client_id = clients.client_id en Spanner)
upsert idp-sub-alejandro alejandro '["CLIENTE"]' 11111111-1111-4111-8111-111111111111
upsert idp-sub-laura     laura     '["CLIENTE"]' 22222222-2222-4222-8222-222222222222
upsert idp-sub-outsider  outsider  '["CLIENTE"]' 33333333-3333-4333-8333-333333333333
# Staff
upsert idp-sub-support  soporte  '["SOPORTE"]'
upsert idp-sub-operator operador '["OPERADOR_FINANCIERO"]'
upsert idp-sub-admin    admin    '["ADMIN"]'

echo
echo "Web API key (publica) para signInWithPassword:"
KEY_NAME="$(gcloud services api-keys list --project "$PROJECT_ID" --format 'value(name)' --limit 1)"
gcloud services api-keys get-key-string "$KEY_NAME" --format 'value(keyString)'
