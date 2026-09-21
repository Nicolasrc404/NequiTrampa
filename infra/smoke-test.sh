#!/usr/bin/env bash
# End-to-end check against Cloud Run: publishes a real event to Pub/Sub and reads it back through the APIs.
# Services are private, so calls carry the caller's identity token. Requires AUTH_DEMO_HEADERS=true at deploy time.
source "$(dirname "$0")/common.sh"
W=$(gcloud run services describe nequi-workers --project "$PROJECT_ID" --region "$REGION" --format 'value(status.url)')
TOKEN=$(gcloud auth print-identity-token)
call() { curl -sS -H "Authorization: Bearer $TOKEN" "$@"; }   # Cloud Run IAM
demo() { call -H "X-Demo-User: $1" -H "X-Demo-Role: ${2:-CLIENTE}" "${@:3}"; }

echo "-- health"; curl -sS -o /dev/null -w "live=%{http_code}\n" -H "Authorization: Bearer $TOKEN" "$W/health/live"
call "$W/health/ready"; echo

EVT="evt-$(date +%s)"
echo "-- publish $EVT to $TOPIC"
gcloud pubsub topics publish "$TOPIC" --project "$PROJECT_ID" --message \
"{\"eventId\":\"$EVT\",\"eventType\":\"RECHARGE_COMPLETED\",\"operationId\":\"op-$EVT\",\"clientId\":\"smoke-user\",\"occurredAt\":\"$(date -u +%FT%TZ)\",\"amountCents\":5000000,\"currency\":\"COP\",\"description\":\"smoke\",\"balanceAfterCents\":5000000}"
sleep 8
echo "-- movements";      demo smoke-user CLIENTE "$W/v1/projections/movements"; echo
echo "-- notifications";  demo smoke-user CLIENTE "$W/v1/notifications"; echo
echo "-- roles";          demo smoke-user CLIENTE "$W/v1/me/access"; echo
echo "-- report";         demo smoke-user CLIENTE -X POST -H "Idempotency-Key: $EVT" -H "Content-Type: application/json" -d '{}' "$W/v1/reports"; echo
echo "-- 401 without user"; call -o /dev/null -w "%{http_code}\n" "$W/v1/notifications"
