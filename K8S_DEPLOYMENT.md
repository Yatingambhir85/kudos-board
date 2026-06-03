# Kubernetes Deployment Guide

## Prerequisites

- **Kubernetes cluster** (local: Docker Desktop, minikube, or kind; production: EKS, GKE, AKS)
- **kubectl** installed and configured
- **ArgoCD** installed (optional, for GitOps)

---

## 1️⃣ Deploy locally (kubectl)

### Step 1: Build images locally
```bash
cd backend
docker build -t kudos-backend:latest .
cd ../frontend
docker build -t kudos-frontend:latest .
cd ..
```

### Step 2: Load images into your cluster (for local K8s)
If using **Docker Desktop K8s** or **minikube**:
```bash
# Docker Desktop: images are automatically available
# Minikube: run this first
minikube image load kudos-backend:latest
minikube image load kudos-frontend:latest
```

### Step 3: Deploy to Kubernetes
```bash
# Apply all manifests
kubectl apply -f k8s/

# Or apply step by step
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

### Step 4: Check status
```bash
kubectl get pods -n kudos-board
kubectl get svc -n kudos-board
```

### Step 5: Access the app
```bash
# For LoadBalancer service (local K8s)
minikube service frontend -n kudos-board

# Or use port-forward
kubectl port-forward -n kudos-board svc/frontend 8080:3000
# Visit: http://localhost:8080
```

---

## 2️⃣ Deploy with ArgoCD (GitOps)

### Prerequisites
- ArgoCD installed in your cluster
- Your repo pushed to GitHub

### Step 1: Install ArgoCD
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### Step 2: Access ArgoCD UI
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Visit: https://localhost:8080
# Login: admin / (get password from: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
```

### Step 3: Create ArgoCD Application
```bash
kubectl apply -f k8s/argocd-app.yaml
```

### Step 4: Monitor sync
- Go to ArgoCD UI
- See `kudos-board` app
- It will auto-sync when code is pushed to `main` branch

---

## 3️⃣ Useful commands

### View logs
```bash
kubectl logs -n kudos-board deployment/backend
kubectl logs -n kudos-board deployment/frontend
kubectl logs -n kudos-board deployment/mongodb
```

### Scale replicas
```bash
kubectl scale deployment backend -n kudos-board --replicas=3
```

### Delete everything
```bash
kubectl delete namespace kudos-board
```

---

## Environment variables

### Backend
- `MONGO_URI=mongodb://mongodb:27017/kudosboard`
- `PORT=5000`
- `NODE_ENV=production`
- `ALLOWED_ORIGINS=*`

Edit in [backend.yaml](./backend.yaml) ConfigMap.

### Frontend
- `VITE_API_URL=http://backend:5000`

Edit in [frontend.yaml](./frontend.yaml) ConfigMap.

---

## Notes

- All services are in the `kudos-board` namespace
- MongoDB has a PVC (5Gi) for persistent storage
- Backend has health checks configured
- Frontend exposes via LoadBalancer (for local K8s, use port-forward)
- NetworkPolicy restricts traffic within namespace

