#!/usr/bin/env bash
# Idempotent: creates only what is missing. Reuses existing Pub/Sub topics, Artifact Registry and service accounts.
# Usage: PROJECT_ID=my-proj REGION=us-central1 ./infra/setup.sh
source "$(dirname "$0")/common.sh"
gcloud config set project "$PROJECT_ID" >/dev/null

echo "== APIs =="
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  pubsub.googleapis.com firestore.googleapis.com secretmanager.googleapis.com spanner.googleapis.com \
  logging.googleapis.com monitoring.googleapis.com cloudscheduler.googleapis.com identitytoolkit.googleapis.com

echo "== Artifact Registry =="
exists gcloud artifacts repositories describe "$AR_REPO" --location "$REGION" ||
  gcloud artifacts repositories create "$AR_REPO" --repository-format docker --location "$REGION" --description "Nequi images"

echo "== Service accounts (least privilege) =="
for sa in "$SA_WORKERS" "$SA_REALTIME" "$SA_PUSH" "$SA_WALLET"; do
  exists gcloud iam service-accounts describe "$(sa_email $sa)" ||
    gcloud iam service-accounts create "$sa" --display-name "$sa"
done
bind() { gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$(sa_email $1)" --role "$2" --condition None >/dev/null; }
# workers: read outbox in Spanner (no write to balances), publish events, write projections/notifications/reports
# outbox_events (mark published) + idempotency_records need writes; balances are only ever written by wallet-service
bind "$SA_WORKERS" roles/spanner.databaseUser
bind "$SA_WORKERS" roles/datastore.user
bind "$SA_WORKERS" roles/pubsub.publisher
bind "$SA_WORKERS" roles/secretmanager.secretAccessor
bind "$SA_WORKERS" roles/logging.logWriter
bind "$SA_WORKERS" roles/monitoring.metricWriter
bind "$SA_REALTIME" roles/logging.logWriter
bind "$SA_REALTIME" roles/monitoring.metricWriter
# wallet: operaciones financieras autoritativas, saldos, ledger y outbox en Spanner
bind "$SA_WALLET" roles/spanner.databaseUser
bind "$SA_WALLET" roles/secretmanager.secretAccessor
bind "$SA_WALLET" roles/logging.logWriter
bind "$SA_WALLET" roles/monitoring.metricWriter

echo "== Pub/Sub =="
for t in "$TOPIC" "$DLQ_TOPIC"; do exists gcloud pubsub topics describe "$t" || gcloud pubsub topics create "$t"; done

# Workers publishes to the topic and its readiness check verifies that the
# configured topic exists/is accessible.
gcloud pubsub topics add-iam-policy-binding "$TOPIC" \
  --member "serviceAccount:$(sa_email $SA_WORKERS)" \
  --role roles/pubsub.viewer \
  >/dev/null
# Pub/Sub service agent must publish to the DLQ and ack from subscriptions
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format 'value(projectNumber)')
PUBSUB_SA="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
gcloud pubsub topics add-iam-policy-binding "$DLQ_TOPIC" --member "serviceAccount:$PUBSUB_SA" --role roles/pubsub.publisher >/dev/null

echo "== Firestore (native) =="
gcloud services enable firestore.googleapis.com --project "$FIRESTORE_PROJECT_ID"

exists gcloud firestore databases describe --database='(default)' --project "$FIRESTORE_PROJECT_ID" ||
  gcloud firestore databases create \
    --database='(default)' \
    --location "${FIRESTORE_LOCATION:-southamerica-west1}" \
    --type firestore-native \
    --project "$FIRESTORE_PROJECT_ID"
echo "== Secret Manager =="
# Value lives only in Secret Manager (never in the repo).
exists gcloud secrets describe nequi-spanner-database ||
  gcloud secrets create nequi-spanner-database --replication-policy automatic
exists gcloud secrets versions describe latest --secret nequi-spanner-database ||
  printf %s "$SPANNER_DATABASE" | gcloud secrets versions add nequi-spanner-database --data-file=-
gcloud secrets add-iam-policy-binding nequi-spanner-database --member "serviceAccount:$(sa_email $SA_WORKERS)" --role roles/secretmanager.secretAccessor >/dev/null
gcloud secrets add-iam-policy-binding nequi-spanner-database --member "serviceAccount:$(sa_email $SA_WALLET)" --role roles/secretmanager.secretAccessor >/dev/null

echo "== Observability =="
exists gcloud logging metrics describe nequi_http_5xx ||
  gcloud logging metrics create nequi_http_5xx --description "Nequi services logging ERROR/CRITICAL" \
    --log-filter 'resource.type="cloud_run_revision" AND severity>=ERROR'
echo "Setup done."
