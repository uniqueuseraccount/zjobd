#!/bin/bash
# --- VERSION 1.5.2 ---
# - Full In-Cluster Build & Deploy Automation
# - Fixed relative path issue for rsync (run from anywhere)
# - Added rsync error handling

NAMESPACE="zjobd"
REGISTRY="registry.${NAMESPACE}.svc.cluster.local:5000"
IMAGE_PREFIX="zjobd"
NFS_WORKSPACE="/Volumes/k3s-data/zjobd-build-workspace-pvc-pvc-2055852f-ee85-4252-8633-2704ee6819ae"

# Get the absolute project root based on script location
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

echo "=== Starting Full Build & Deploy Cycle ==="

# 1. Sync
echo ">>> Syncing source from $PROJECT_ROOT to $NFS_WORKSPACE..."
rsync -av --delete --progress "$PROJECT_ROOT/backend" "$PROJECT_ROOT/frontend" "$NFS_WORKSPACE/" \
    --exclude="node_modules" \
    --exclude="newvenv" \
    --exclude="venv" \
    --exclude=".git"

if [ $? -ne 0 ]; then
    echo "ERROR: Source sync failed. Please check NFS mount and paths."
    exit 1
fi

# 2. Trigger Builds
echo ">>> Submitting build pods..."
kubectl delete pod kaniko-backend kaniko-frontend -n ${NAMESPACE} --ignore-not-found

# Backend build pod
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-backend
  namespace: ${NAMESPACE}
spec:
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:latest
    args:
    - "--context=dir:///workspace/backend"
    - "--dockerfile=Dockerfile"
    - "--destination=${REGISTRY}/${IMAGE_PREFIX}-backend:latest"
    - "--insecure"
    - "--skip-tls-verify"
    volumeMounts:
    - name: work
      mountPath: /workspace
  restartPolicy: Never
  volumes:
  - name: work
    persistentVolumeClaim:
      claimName: build-workspace-pvc
EOF

# Frontend build pod
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-frontend
  namespace: ${NAMESPACE}
spec:
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:latest
    args:
    - "--context=dir:///workspace/frontend"
    - "--dockerfile=Dockerfile"
    - "--destination=${REGISTRY}/${IMAGE_PREFIX}-frontend:latest"
    - "--insecure"
    - "--skip-tls-verify"
    volumeMounts:
    - name: work
      mountPath: /workspace
  restartPolicy: Never
  volumes:
  - name: work
    persistentVolumeClaim:
      claimName: build-workspace-pvc
EOF

# 3. Stream logs until completion
echo ">>> Streaming Backend Build Logs..."
kubectl wait --for=condition=Ready pod/kaniko-backend -n ${NAMESPACE} --timeout=120s
kubectl logs -f kaniko-backend -n ${NAMESPACE}

echo ">>> Streaming Frontend Build Logs..."
kubectl wait --for=condition=Ready pod/kaniko-frontend -n ${NAMESPACE} --timeout=120s
kubectl logs -f kaniko-frontend -n ${NAMESPACE}

# 4. Finalize
echo ">>> Triggering rollout..."
kubectl rollout restart deployment/backend -n ${NAMESPACE}
kubectl rollout restart deployment/frontend -n ${NAMESPACE}

echo ">>> Waiting for health..."
kubectl rollout status deployment/backend -n ${NAMESPACE}
kubectl rollout status deployment/frontend -n ${NAMESPACE}

echo "=== System is LIVE ==="
