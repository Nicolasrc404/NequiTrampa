#!/usr/bin/env bash
# Shared settings. Override via environment: PROJECT_ID, REGION, AR_REPO, TOPIC.
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  for gcloud_dir in /c/Users/*/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin; do
    [ -d "$gcloud_dir" ] || continue
    export PATH="$PATH:$gcloud_dir"
    break
  done
fi
export PROJECT_ID="${PROJECT_ID:-full-stack-2026}"
export FIRESTORE_PROJECT_ID="${FIRESTORE_PROJECT_ID:-fullstack-d3be5}"
export REGION="${REGION:-southamerica-west1}"
export AR_REPO="${AR_REPO:-servicios}"                 # Artifact Registry repo (reused if it already exists)
export TOPIC="${TOPIC:-wallet-events}"             # outbox events topic (reused if it already exists)
export DLQ_TOPIC="${DLQ_TOPIC:-wallet-events-dlq}"
export IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"

export SPANNER_DATABASE="${SPANNER_DATABASE:-projects/${PROJECT_ID}/instances/finanzas-mvp/databases/finanzas-core}"
# Existing service accounts are reused (outbox-dispatcher already publishes to the topic).
export SA_WORKERS="outbox-dispatcher"
export SA_REALTIME="realtime-service"
export SA_PUSH="pubsub-push-invoker"
export SA_WALLET="${SA_WALLET:-wallet-service}"
sa_email() { echo "$1@${PROJECT_ID}.iam.gserviceaccount.com"; }

exists() { "$@" >/dev/null 2>&1; }              # exists gcloud x describe y
