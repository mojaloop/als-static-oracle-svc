#!/bin/bash
set -euxo pipefail

docker load -i /tmp/docker-image.tar

echo "Building docker image..."
docker compose build

echo "Starting docker compose..."
docker compose up -d

echo "Checking docker compose status..."
docker compose ps

docker compose run --rm als-static-oracle-svc

echo "Running integration tests..."
npm ci
NODE_ENV=integration npm -s run test:int

echo "Stopping docker compose..."
docker compose down -v

echo "Integration tests complete. Results in ./test/results"
