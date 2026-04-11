#!/bin/bash
# --- VERSION 1.2.0 ---
# - Multi-arch build script for ZJOBD
# - Improved path handling (run from anywhere)
# - Added Docker existence check

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

REGISTRY="localhost:5000"
IMAGE_PREFIX="zjobd"

# 0. Check for Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: 'docker' command not found. Please ensure Docker Desktop is installed and running."
    exit 1
fi

echo "=== Starting Multi-Arch Build Process ==="

# 1. Start Port Forward to Registry in background
echo ">>> Opening tunnel to cluster registry..."
kubectl port-forward -n zjobd service/registry 5000:5000 &
PF_PID=$!

# Give it a second to connect
sleep 3

# 2. Ensure buildx is ready
docker buildx create --use --name zjobd-builder \
  --driver-opt network=host \
  --buildkitd-flags '--allow-insecure-entitlement network.host' 2>/dev/null || docker buildx use zjobd-builder

# 3. Build & Push Backend
echo ">>> Building Backend (amd64, arm64)..."
cd "$PROJECT_ROOT/backend"
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ${REGISTRY}/${IMAGE_PREFIX}-backend:latest \
  --push .

# 4. Build & Push Frontend
echo ">>> Building Frontend (amd64, arm64)..."
cd "$PROJECT_ROOT/frontend"
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ${REGISTRY}/${IMAGE_PREFIX}-frontend:latest \
  --push .

# 5. Cleanup
kill $PF_PID
echo "=== Build and Push Complete ==="
echo "Updating manifests..."
kubectl rollout restart deployment/backend -n zjobd
kubectl rollout restart deployment/frontend -n zjobd
