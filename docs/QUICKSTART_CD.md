# Quick Start: CD Pipeline Setup

This guide will help you get the CD pipeline up and running in under 45 minutes.

## Prerequisites

- Azure subscription
- Azure CLI installed and configured (`az login`)
- GitHub repository with Actions enabled
- Existing ACR: `filevaultregistry2025`

## Step-by-Step Setup

### Step 1: Create Azure Resources (15 minutes)

```bash
# Set variables
RESOURCE_GROUP="filevault-rg"
LOCATION="uksouth"
KEYVAULT_NAME="filevault-kv-$(date +%s)"  # Unique name
WEBAPP_NAME="filevault-app-$(date +%s)"   # Unique name
APP_PLAN="filevault-plan"

# Create Resource Group (if not exists)
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Key Vault
az keyvault create \
  --name $KEYVAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Create App Service Plan
az appservice plan create \
  --name $APP_PLAN \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B1

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_PLAN \
  --name $WEBAPP_NAME \
  --deployment-container-image-name filevaultregistry2025.azurecr.io/filevault:latest
```

### Step 2: Configure Key Vault Secrets (5 minutes)

**Option A: Use the automation script (recommended)**
```bash
chmod +x scripts/setup-keyvault.sh
./scripts/setup-keyvault.sh
```

**Option B: Manual setup**
```bash
# Add secrets to Key Vault
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name AZURE-STORAGE-ACCOUNT-NAME \
  --value "your-storage-account-name"

az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name AZURE-STORAGE-ACCOUNT-KEY \
  --value "your-storage-account-key"

az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name AZURE-CONTAINER-NAME \
  --value "your-container-name"
```

### Step 3: Create Service Principal (5 minutes)

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create service principal (save the output!)
az ad sp create-for-rbac \
  --name "github-actions-filevault" \
  --role contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --sdk-auth

# Grant Key Vault access to service principal
SP_OBJECT_ID=$(az ad sp list --display-name "github-actions-filevault" --query "[0].id" -o tsv)

az keyvault set-policy \
  --name $KEYVAULT_NAME \
  --object-id $SP_OBJECT_ID \
  --secret-permissions get list
```

### Step 4: Configure Web App (5 minutes)

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name filevaultregistry2025 --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name filevaultregistry2025 --query "passwords[0].value" -o tsv)

# Configure Web App to use ACR
az webapp config container set \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name filevaultregistry2025.azurecr.io/filevault:latest \
  --docker-registry-server-url https://filevaultregistry2025.azurecr.io \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD

# Enable container logging
az webapp log config \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-container-logging filesystem
```

### Step 5: Add GitHub Secrets (10 minutes)

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

1. **ACR_LOGIN_SERVER**
   ```
   filevaultregistry2025.azurecr.io
   ```

2. **ACR_USERNAME**
   ```bash
   az acr credential show --name filevaultregistry2025 --query username -o tsv
   ```

3. **ACR_PASSWORD**
   ```bash
   az acr credential show --name filevaultregistry2025 --query "passwords[0].value" -o tsv
   ```

4. **AZURE_CREDENTIALS**
   - Use the JSON output from Step 3 (service principal creation)

5. **AZURE_WEBAPP_NAME**
   ```bash
   echo $WEBAPP_NAME
   ```

6. **KEY_VAULT_NAME**
   ```bash
   echo $KEYVAULT_NAME
   ```

7. **SONAR_TOKEN** (if using SonarQube)
   - Get from your SonarQube instance

8. **SONAR_HOST_URL** (if using SonarQube)
   - Your SonarQube URL

### Step 6: Create GitHub Environment (Optional, 5 minutes)

1. Go to Settings → Environments
2. Click "New environment"
3. Name it `production`
4. Add protection rules if desired:
   - Required reviewers
   - Wait timer
   - Deployment branches: main

### Step 7: Test the Pipeline (5 minutes)

```bash
# Make a test change
git checkout main
git commit --allow-empty -m "Test CD pipeline"
git push origin main
```

Then:
1. Go to Actions tab on GitHub
2. Watch the pipeline run
3. All stages should complete successfully
4. Check deployment: `https://<your-webapp-name>.azurewebsites.net`

## Verification Checklist

- [ ] Key Vault created with secrets
- [ ] App Service running
- [ ] Service principal created with Key Vault access
- [ ] All 8 GitHub secrets configured
- [ ] Production environment created (optional)
- [ ] Pipeline runs successfully
- [ ] Application accessible at Azure URL

## Quick Commands Reference

### View your resources
```bash
# Resource group contents
az resource list --resource-group $RESOURCE_GROUP --output table

# Web App URL
echo "https://$(az webapp show --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)"

# View application logs
az webapp log tail --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP
```

### Troubleshooting
```bash
# Check Web App status
az webapp show --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP --query state

# Restart Web App
az webapp restart --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP

# View Key Vault secrets (names only)
az keyvault secret list --vault-name $KEYVAULT_NAME --query "[].name"

# Test Key Vault access
az keyvault secret show --vault-name $KEYVAULT_NAME --name AZURE-STORAGE-ACCOUNT-NAME --query value -o tsv
```

## Common Issues

### Issue: Service principal creation fails
**Solution**: You might need additional permissions. Contact your Azure admin.

### Issue: Key Vault access denied in pipeline
**Solution**: Verify service principal has access:
```bash
az keyvault show --name $KEYVAULT_NAME --query properties.accessPolicies
```

### Issue: Web App won't start
**Solution**: Check logs:
```bash
az webapp log tail --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP
```

### Issue: ACR authentication fails
**Solution**: Verify admin user is enabled:
```bash
az acr update --name filevaultregistry2025 --admin-enabled true
```

## Next Steps

1. Review the complete documentation:
   - [Deployment Guide](docs/DEPLOYMENT.md)
   - [Pipeline Overview](docs/PIPELINE_OVERVIEW.md)
   - [Secrets Template](docs/SECRETS_TEMPLATE.md)

2. Set up monitoring:
   - Enable Application Insights
   - Configure alerts
   - Set up availability tests

3. Implement best practices:
   - Rotate secrets regularly
   - Set up staging environment
   - Enable diagnostic logging

## Summary

You now have:
- Automated CI/CD pipeline
- Secure secret management with Key Vault
- Containerized deployment to Azure App Service
- Complete documentation and troubleshooting guides

**Deployment URL**: Check your GitHub Actions output or run:
```bash
echo "https://$(az webapp show --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)"
```

## Getting Help

If you encounter issues:
1. Check GitHub Actions logs for detailed errors
2. Review Azure resource configurations
3. Consult the troubleshooting sections in the documentation
4. Verify all prerequisites are met

Happy deploying!
