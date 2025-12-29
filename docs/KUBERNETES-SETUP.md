# Kubernetes Deployment Guide for Filevault

## Prerequisites

1. **Minikube** (for local testing) or a cloud-managed Kubernetes service (EKS/AKS)
2. **kubectl** CLI tool installed
3. Docker image pushed to Azure Container Registry: `filevaultregistry2025.azurecr.io/filevault:latest`

## Setup Instructions

### Option 1: Using Minikube (Local Development)

#### 1. Start Minikube
```powershell
minikube start
```

#### 2. Verify Cluster Status
```powershell
kubectl cluster-info
kubectl get nodes
```

#### 3. Configure ACR Access
Create a secret to pull images from Azure Container Registry:
```powershell
kubectl create secret docker-registry acr-secret `
  --docker-server=filevaultregistry2025.azurecr.io `
  --docker-username=<ACR_USERNAME> `
  --docker-password=<ACR_PASSWORD> `
  --docker-email=<YOUR_EMAIL>
```

#### 4. Create Secrets
Update `k8s-secrets.yaml` with your actual Azure Storage credentials, then apply:
```powershell
kubectl apply -f k8s-secrets.yaml
```

#### 5. Deploy Application
```powershell
kubectl apply -f k8s-deployment.yaml
kubectl apply -f k8s-service.yaml
```

#### 6. Verify Deployment
```powershell
kubectl get deployments
kubectl get pods
kubectl get services
```

#### 7. Access the Application
For Minikube, get the service URL:
```powershell
minikube service filevault-service --url
```

### Option 2: Using Azure Kubernetes Service (AKS)

#### 1. Create AKS Cluster
```powershell
az aks create `
  --resource-group <RESOURCE_GROUP> `
  --name filevault-cluster `
  --node-count 2 `
  --enable-addons monitoring `
  --generate-ssh-keys
```

#### 2. Get Credentials
```powershell
az aks get-credentials --resource-group <RESOURCE_GROUP> --name filevault-cluster
```

#### 3. Attach ACR to AKS
```powershell
az aks update `
  --resource-group <RESOURCE_GROUP> `
  --name filevault-cluster `
  --attach-acr filevaultregistry2025
```

Note: When using `--attach-acr`, you don't need to create the `acr-secret`. Remove the `imagePullSecrets` section from `k8s-deployment.yaml`.

#### 4. Create Secrets
```powershell
kubectl apply -f k8s-secrets.yaml
```

#### 5. Deploy Application
```powershell
kubectl apply -f k8s-deployment.yaml
kubectl apply -f k8s-service.yaml
```

#### 6. Get External IP
```powershell
kubectl get services filevault-service --watch
```

Wait until EXTERNAL-IP shows an IP address (not `<pending>`).

## Useful Commands

### Check Pod Logs
```powershell
kubectl logs -l app=filevault
```

### Describe Pod (for troubleshooting)
```powershell
kubectl describe pod <POD_NAME>
```

### Scale Deployment
```powershell
kubectl scale deployment filevault-deployment --replicas=3
```

### Update Deployment (after pushing new image)
```powershell
kubectl rollout restart deployment filevault-deployment
```

### Delete Resources
```powershell
kubectl delete -f k8s-service.yaml
kubectl delete -f k8s-deployment.yaml
kubectl delete -f k8s-secrets.yaml
```

## Configuration Files Overview

- **k8s-deployment.yaml**: Defines the deployment with 2 replicas, resource limits, health checks, and environment variables
- **k8s-service.yaml**: LoadBalancer service exposing the app on port 80
- **k8s-secrets.yaml**: Stores sensitive Azure Storage credentials

## Security Notes

1. Never commit `k8s-secrets.yaml` with actual credentials to version control
2. Consider using Azure Key Vault for secrets management in production
3. Update the placeholder values in `k8s-secrets.yaml` before deployment

## Monitoring

View application status:
```powershell
kubectl get all -l app=filevault
```

Check resource usage:
```powershell
kubectl top pods -l app=filevault
```
