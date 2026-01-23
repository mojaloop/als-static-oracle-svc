#!/bin/bash
set -euxo pipefail

# For CI environments where docker images are pre-built and saved as tar files
docker load -i /tmp/docker-image.tar

# For local development environments where docker images need to be built
# docker compose build

echo "Starting docker compose..."
docker compose up -d

echo "Checking docker compose status..."
docker compose ps

echo "Running integration tests..."
npm ci
NODE_ENV=integration npm -s run test:int

echo "Stopping docker compose..."
docker compose down -v

echo "Integration tests complete. Results in ./test/results"
