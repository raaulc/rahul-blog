#!/bin/bash
# Copy the recommender service code and model artifacts from the realtime-recs repo.
# The site runs them as an on-demand Vercel function for the live demo.
set -e
RECS_DIR="${RECS_DIR:-$HOME/projects/realtime-recs}"
cd "$(dirname "$0")/.."
for f in gbdt model npy ranking guardrails recommender store; do
  cp "$RECS_DIR/service/src/$f.ts" src/lib/recs/
done
mkdir -p recs-artifacts
for f in item_vectors.npy knn_indices.npy knn_values.npy item_ctx.npy item_genres.npy items.json ranker.json metrics.json; do
  cp "$RECS_DIR/artifacts/$f" recs-artifacts/
done
echo "synced from $RECS_DIR ($(cd "$RECS_DIR" && git rev-parse --short HEAD))" | tee recs-artifacts/SOURCE
