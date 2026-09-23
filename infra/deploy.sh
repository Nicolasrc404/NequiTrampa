#!/usr/bin/env bash
# Builds with Cloud Build (no local Docker needed), deploys to Cloud Run and wires Pub/Sub push subscriptions.
# Usage: PROJECT_ID=my-proj ./infra/deploy.sh [wallet|workers|realtime|all]
source "$(dirname "$0")/common.sh"
cd "$(dirname "$0")/.."
TARGET="${1:-all}"
DEMO="${AUTH_DEMO_HEADERS:-false}"   # true => X-Demo-User smoke-test scheme; only safe because services stay private (IAM)

build() { # $1=service dir name, $2=image name
  gcloud builds submit . --project "$PROJECT_ID" --config infra/cloudbuild.yaml \
    --substitutions "_SERVICE=$1,_IMAGE=${IMAGE_BASE}/$2:latest"
}

deploy_wallet() {
  build Nequi.Wallet wallet
  local secrets=""
  exists gcloud secrets versions describe latest --secret nequi-spanner-database && secrets="--set-secrets Spanner__Database=nequi-spanner-database:latest"
  gcloud run deploy nequi-wallet --project "$PROJECT_ID" --region "$REGION" \
    --image "${IMAGE_BASE}/wallet:latest" --service-account "$(sa_email $SA_WALLET)" \
    --no-allow-unauthenticated --min-instances 0 --max-instances 5 --memory 512Mi \
    --set-env-vars "Gcp__ProjectId=${PROJECT_ID},Data__Backend=gcp,Auth__DemoHeaders=${DEMO}" $secrets
}

deploy_workers() {
  build Nequi.Workers workers
  local secrets=""
  exists gcloud secrets versions describe latest --secret nequi-spanner-database && secrets="--set-secrets Spanner__Database=nequi-spanner-database:latest"
  # CPU always allocated + min 1 instance: the outbox worker polls in the background.
  gcloud run deploy nequi-workers --project "$PROJECT_ID" --region "$REGION" \
    --image "${IMAGE_BASE}/workers:latest" --service-account "$(sa_email $SA_WORKERS)" \
    --no-allow-unauthenticated --no-cpu-throttling --min-instances 1 --max-instances 3 --memory 512Mi \
    --set-env-vars "Gcp__ProjectId=${PROJECT_ID},Data__Backend=gcp,PubSub__OutboxTopic=${TOPIC},Auth__DemoHeaders=${DEMO}" $secrets
}

deploy_realtime() {
  build Nequi.Realtime realtime
  # max-instances 1: connections live in memory (Memorystore was ruled out for the MVP), so one instance sees every socket.
  gcloud run deploy nequi-realtime --project "$PROJECT_ID" --region "$REGION" \
    --image "${IMAGE_BASE}/realtime:latest" --service-account "$(sa_email $SA_REALTIME)" \
    --no-allow-unauthenticated --min-instances 0 --max-instances 1 --timeout 3600 --session-affinity --memory 512Mi \
    --set-env-vars "Gcp__ProjectId=${PROJECT_ID},Data__Backend=memory,Auth__DemoHeaders=${DEMO}" # realtime stores nothing: no Firestore access needed
}

url_of() { gcloud run services describe "$1" --project "$PROJECT_ID" --region "$REGION" --format 'value(status.url)'; }

subscribe() { # $1=name $2=service $3=path
  local url; url="$(url_of "$2")"
  gcloud run services add-iam-policy-binding "$2" --project "$PROJECT_ID" --region "$REGION" \
    --member "serviceAccount:$(sa_email $SA_PUSH)" --role roles/run.invoker >/dev/null
  local args=(--push-endpoint "${url}$3" --push-auth-service-account "$(sa_email $SA_PUSH)"
    --push-auth-token-audience "$url" --dead-letter-topic "$DLQ_TOPIC" --max-delivery-attempts 5
    --min-retry-delay 5s --max-retry-delay 60s)
  if exists gcloud pubsub subscriptions describe "$1"; then gcloud pubsub subscriptions update "$1" "${args[@]}"
  else gcloud pubsub subscriptions create "$1" --topic "$TOPIC" "${args[@]}"; fi
  gcloud pubsub subscriptions add-iam-policy-binding "$1" \
    --member "serviceAccount:service-$(gcloud projects describe "$PROJECT_ID" --format 'value(projectNumber)')@gcp-sa-pubsub.iam.gserviceaccount.com" \
    --role roles/pubsub.subscriber >/dev/null
}

case "$TARGET" in
  wallet|all)   deploy_wallet ;;
esac
case "$TARGET" in
  workers|all)  deploy_workers ;;
esac
case "$TARGET" in
  realtime|all) deploy_realtime ;;
esac
case "$TARGET" in
  workers|all)  subscribe workers-projection nequi-workers /internal/pubsub/projection
                subscribe workers-notifications nequi-workers /internal/pubsub/notifications ;;
esac
case "$TARGET" in
  realtime|all) subscribe realtime-push nequi-realtime /internal/pubsub/realtime ;;
esac

echo "wallet  : $(url_of nequi-wallet 2>/dev/null || true)"
echo "workers : $(url_of nequi-workers 2>/dev/null || true)"
echo "realtime: $(url_of nequi-realtime 2>/dev/null || true)"
