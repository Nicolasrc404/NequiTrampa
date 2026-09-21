#!/usr/bin/env bash
# Shared settings. Override via environment: PROJECT_ID, REGION, AR_REPO, TOPIC.
set -euo pipefail

export PATH="$PATH:/c/Users/PC/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin"
export PROJECT_ID="${PROJECT_ID:-finanzas-mvp-2026}"
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
sa_email() { echo "$1@${PROJECT_ID}.iam.gserviceaccount.com"; }

exists() { "$@" >/dev/null 2>&1; }              # exists gcloud x describe y
