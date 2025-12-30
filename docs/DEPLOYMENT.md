# Deployment Guide

This document provides instructions for deploying FileVault to Azure App Service with automated CI/CD pipelines.

## Prerequisites

- Azure subscription
- Azure Container Registry (ACR)
- Azure App Service (Web App for Containers)
- Azure Key Vault
- GitHub repository with Actions enabled

## Architecture Overview

The deployment pipeline consists of:
1. **CI Pipeline**: Linting, testing, and SonarQube analysis
2. **Build Stage**: Docker image build and push to ACR
3. **CD Pipeline**: Deployment to Azure App Service with Key Vault integration

## Azure Resources Setup

### 1. Azure Container Registry (ACR)

Create an Azure Container Registry if you don't have one:

```bash
az acr create \
  --resource-group <resource-group-name> \
  --name filevaultregistry2025 \
  --sku Basic \
  --location uksouth
```

Enable admin user:

```bash
az acr update --name filevaultregistry2025 --admin-enabled true
```

Get credentials:

```bash
az acr credential show --name filevaultregistry2025
```

### 2. Azure Key Vault

Create a Key Vault:

```bash
az keyvault create \
  --name <keyvault-name> \
  --resource-group <resource-group-name> \
  --location uksouth
```

Add secrets to Key Vault:

```bash
# Storage Account Name
az keyvault secret set \
  --vault-name <keyvault-name> \
  --name AZURE-STORAGE-ACCOUNT-NAME \
  --value <your-storage-account-name>

# Storage Account Key
az keyvault secret set \
  --vault-name <keyvault-name> \
  --name AZURE-STORAGE-ACCOUNT-KEY \
  --value <your-storage-account-key>

# Container Name
az keyvault secret set \
  --vault-name <keyvault-name> \
  --name AZURE-CONTAINER-NAME \
  --value <your-container-name>
```

### 3. Azure App Service

Create an App Service Plan (Linux):

```bash
az appservice plan create \
  --name filevault-plan \
  --resource-group <resource-group-name> \
  --is-linux \
  --sku B1 \
  --location uksouth
```

Create a Web App for Containers:

```bash
az webapp create \
  --resource-group <resource-group-name> \
  --plan filevault-plan \
  --name <webapp-name> \
  --deployment-container-image-name filevaultregistry2025.azurecr.io/filevault:latest
```

Configure the Web App to use ACR:

```bash
az webapp config container set \
  --name <webapp-name> \
  --resource-group <resource-group-name> \
  --docker-custom-image-name filevaultregistry2025.azurecr.io/filevault:latest \
  --docker-registry-server-url https://filevaultregistry2025.azurecr.io \
  --docker-registry-server-user <acr-username> \
  --docker-registry-server-password <acr-password>
```

### 4. Service Principal for GitHub Actions

Create a service principal with contributor access:

```bash
az ad sp create-for-rbac \
  --name "github-actions-filevault" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group-name> \
  --sdk-auth
```

This will output JSON credentials. Save this for GitHub secrets.

Grant the service principal access to Key Vault:

```bash
# Get the service principal object ID
SP_OBJECT_ID=$(az ad sp list --display-name "github-actions-filevault" --query "[0].id" -o tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name <keyvault-name> \
  --object-id $SP_OBJECT_ID \
  --secret-permissions get list
```

## GitHub Secrets Configuration

Configure the following secrets in your GitHub repository (Settings > Secrets and variables > Actions > New repository secret):

### Required Secrets

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `ACR_LOGIN_SERVER` | ACR login server URL | `filevaultregistry2025.azurecr.io` |
| `ACR_USERNAME` | ACR username | From `az acr credential show` |
| `ACR_PASSWORD` | ACR password | From `az acr credential show` |
| `AZURE_CREDENTIALS` | Service principal credentials | From `az ad sp create-for-rbac` (entire JSON output) |
| `AZURE_WEBAPP_NAME` | Azure Web App name | Your Web App name |
| `KEY_VAULT_NAME` | Azure Key Vault name | Your Key Vault name |
| `SONAR_TOKEN` | SonarQube token | From SonarQube instance |
| `SONAR_HOST_URL` | SonarQube host URL | Your SonarQube instance URL |

### Setting Secrets in GitHub

1. Navigate to your repository on GitHub
2. Go to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value
5. Click **Add secret**

## Pipeline Workflow

### CI/CD Pipeline Stages

1. **Lint**: Runs ESLint on all source files
2. **Test**: Runs Jest tests with coverage
3. **SonarQube**: Performs code quality analysis
4. **Build Status**: Validates all previous jobs passed
5. **Build and Push**: Builds Docker image and pushes to ACR (main branch only)
6. **Deploy**: Deploys to Azure App Service with Key Vault secrets (main branch only)

### Triggering Deployments

Deployments are automatically triggered when:
- Code is pushed to the `main` branch
- All CI checks (lint, test, SonarQube) pass successfully

Pull requests will run CI checks but won't trigger deployments.

## Environment Configuration

The pipeline uses GitHub Environments for deployment protection:

### Setting up Production Environment

1. Go to repository **Settings** > **Environments**
2. Create a new environment named `production`
3. (Optional) Add protection rules:
   - Required reviewers
   - Wait timer
   - Deployment branches (limit to `main`)

## Secrets Management Best Practices

### Azure Key Vault Benefits

- **Centralized Management**: All secrets stored in one secure location
- **Access Control**: Fine-grained permissions using Azure RBAC
- **Audit Logging**: Track all secret access
- **Rotation**: Easy secret rotation without updating pipelines
- **Encryption**: Secrets encrypted at rest and in transit

### Key Vault Secret Naming Convention

Use uppercase with hyphens for secret names:
- `AZURE-STORAGE-ACCOUNT-NAME`
- `AZURE-STORAGE-ACCOUNT-KEY`
- `AZURE-CONTAINER-NAME`

### Rotating Secrets

To rotate secrets:

1. Update the secret in Azure Key Vault:
```bash
az keyvault secret set \
  --vault-name <keyvault-name> \
  --name AZURE-STORAGE-ACCOUNT-KEY \
  --value <new-value>
```

2. Restart the Web App to pick up new values:
```bash
az webapp restart --name <webapp-name> --resource-group <resource-group-name>
```

No GitHub Actions changes required.

## Monitoring and Troubleshooting

### Viewing Pipeline Logs

1. Go to the **Actions** tab in your GitHub repository
2. Select the workflow run
3. Click on a job to view detailed logs

### Common Issues

#### Image Pull Failure
**Symptom**: Web App can't pull Docker image from ACR

**Solution**: Verify ACR credentials are correctly configured:
```bash
az webapp config container show --name <webapp-name> --resource-group <resource-group-name>
```

#### Key Vault Access Denied
**Symptom**: Pipeline fails at "Retrieve secrets from Azure Key Vault" step

**Solution**: Verify service principal has Key Vault access:
```bash
az keyvault show --name <keyvault-name> --query properties.accessPolicies
```

#### Application Not Starting
**Symptom**: Container starts but application doesn't respond

**Solution**: Check application logs:
```bash
az webapp log tail --name <webapp-name> --resource-group <resource-group-name>
```

### Health Checks

Monitor the deployed application:

```bash
# Check Web App status
az webapp show --name <webapp-name> --resource-group <resource-group-name> --query state

# View application logs
az webapp log tail --name <webapp-name> --resource-group <resource-group-name>

# View deployment logs
az webapp log deployment show --name <webapp-name> --resource-group <resource-group-name>
```

## Manual Deployment

If you need to deploy manually:

```bash
# Build and push image
docker build -f config/Dockerfile -t filevaultregistry2025.azurecr.io/filevault:manual .
az acr login --name filevaultregistry2025
docker push filevaultregistry2025.azurecr.io/filevault:manual

# Update Web App
az webapp config container set \
  --name <webapp-name> \
  --resource-group <resource-group-name> \
  --docker-custom-image-name filevaultregistry2025.azurecr.io/filevault:manual
```

## Rollback Procedure

To rollback to a previous version:

```bash
# List recent images
az acr repository show-tags --name filevaultregistry2025 --repository filevault --orderby time_desc

# Deploy specific version
az webapp config container set \
  --name <webapp-name> \
  --resource-group <resource-group-name> \
  --docker-custom-image-name filevaultregistry2025.azurecr.io/filevault:<git-sha>
```

## Cost Optimization

### Resource Tier Recommendations

- **Development**: B1 App Service Plan, Basic ACR
- **Production**: P1V2 App Service Plan, Standard ACR with geo-replication

### Reducing Costs

1. Use Azure App Service auto-scaling
2. Enable ACR image caching
3. Clean up old Docker images:
```bash
az acr repository delete --name filevaultregistry2025 --image filevault:<old-tag>
```

## Security Considerations

1. **Never commit secrets** to source control
2. **Use managed identities** when possible instead of service principals
3. **Enable Azure Defender** for Container Registry
4. **Implement network restrictions** on Key Vault
5. **Regularly rotate** ACR credentials and storage account keys
6. **Enable diagnostic logging** on all Azure resources
7. **Use Azure Front Door** or Application Gateway for production workloads

## Additional Resources

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Azure Container Registry Documentation](https://docs.microsoft.com/azure/container-registry/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/azure/key-vault/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
