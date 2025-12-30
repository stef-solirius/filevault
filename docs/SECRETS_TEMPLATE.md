# GitHub Secrets Configuration Template

This document provides a template for configuring GitHub secrets required for the CI/CD pipeline.

## Required Secrets Checklist

Copy this checklist and fill in the values as you configure each secret:

### Azure Container Registry (ACR)

- [ ] **ACR_LOGIN_SERVER**
  - Description: Azure Container Registry login server URL
  - Value: `filevaultregistry2025.azurecr.io`
  - How to get: This is your ACR name followed by `.azurecr.io`

- [ ] **ACR_USERNAME**
  - Description: Azure Container Registry admin username
  - Value: `________________________`
  - How to get: Run `az acr credential show --name filevaultregistry2025 --query username -o tsv`

- [ ] **ACR_PASSWORD**
  - Description: Azure Container Registry admin password
  - Value: `________________________`
  - How to get: Run `az acr credential show --name filevaultregistry2025 --query "passwords[0].value" -o tsv`

### Azure Authentication

- [ ] **AZURE_CREDENTIALS**
  - Description: Service principal credentials for Azure authentication
  - Value: (JSON format - see below)
  - How to get: Run the service principal creation command (see below)

**Service Principal JSON Format:**
```json
{
  "clientId": "<client-id>",
  "clientSecret": "<client-secret>",
  "subscriptionId": "<subscription-id>",
  "tenantId": "<tenant-id>",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**To create service principal:**
```bash
az ad sp create-for-rbac \
  --name "github-actions-filevault" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group-name> \
  --sdk-auth
```

### Azure App Service

- [ ] **AZURE_WEBAPP_NAME**
  - Description: Name of your Azure Web App
  - Value: `________________________`
  - How to get: The name you chose when creating the App Service
  - Example: `filevault-webapp-prod`

### Azure Key Vault

- [ ] **KEY_VAULT_NAME**
  - Description: Name of your Azure Key Vault
  - Value: `________________________`
  - How to get: The name you chose when creating the Key Vault
  - Example: `filevault-keyvault`

### SonarQube (Optional)

- [ ] **SONAR_TOKEN**
  - Description: SonarQube authentication token
  - Value: `________________________`
  - How to get: Generate from SonarQube: My Account > Security > Generate Tokens

- [ ] **SONAR_HOST_URL**
  - Description: SonarQube server URL
  - Value: `________________________`
  - Example: `https://sonarcloud.io` or your self-hosted instance URL

## Quick Setup Commands

### 1. Get ACR Credentials

```bash
# Login to Azure
az login

# Get ACR credentials
az acr credential show --name filevaultregistry2025

# Enable admin user if not enabled
az acr update --name filevaultregistry2025 --admin-enabled true
```

### 2. Create Service Principal

```bash
# Get your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Get your resource group name
RESOURCE_GROUP="<your-resource-group>"

# Create service principal
az ad sp create-for-rbac \
  --name "github-actions-filevault" \
  --role contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --sdk-auth
```

### 3. Grant Key Vault Access to Service Principal

```bash
# Get the service principal object ID
SP_OBJECT_ID=$(az ad sp list --display-name "github-actions-filevault" --query "[0].id" -o tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name <your-keyvault-name> \
  --object-id $SP_OBJECT_ID \
  --secret-permissions get list
```

### 4. Verify Azure Web App

```bash
# List your web apps
az webapp list --query "[].{Name:name, ResourceGroup:resourceGroup, State:state}" -o table

# Get Web App details
az webapp show --name <webapp-name> --resource-group <resource-group-name>
```

## Adding Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Enter the secret name (must match exactly as listed above)
5. Paste the secret value
6. Click **Add secret**
7. Repeat for all secrets

## Environment Setup (Optional)

For additional deployment protection, create a GitHub Environment:

1. Go to **Settings** > **Environments**
2. Click **New environment**
3. Name it `production`
4. Configure protection rules:
   - **Required reviewers**: Add team members who must approve deployments
   - **Wait timer**: Set a delay before deployment (e.g., 5 minutes)
   - **Deployment branches**: Select "Selected branches" and add `main`

## Verification

After adding all secrets, verify your setup:

### Check GitHub Secrets
1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Verify all required secrets are listed
3. Secret values are hidden, but you can see when they were last updated

### Test the Pipeline
1. Make a small change to your code
2. Create a branch: `git checkout -b test-pipeline`
3. Commit and push: `git add . && git commit -m "Test pipeline" && git push origin test-pipeline`
4. Create a pull request to `main`
5. Check that CI jobs run successfully
6. After merging, verify the CD pipeline runs and deploys

### Troubleshooting

**Secret not found error:**
- Verify the secret name matches exactly (case-sensitive)
- Check that the secret was added to the correct repository

**Authentication failed:**
- Verify `AZURE_CREDENTIALS` contains valid JSON
- Ensure service principal has correct permissions
- Check that service principal hasn't expired

**Key Vault access denied:**
- Verify service principal has access to Key Vault
- Check that secrets exist in Key Vault with correct names
- Ensure Key Vault is in the same subscription

**ACR login failed:**
- Verify ACR admin user is enabled
- Check ACR credentials are correct
- Ensure ACR is accessible from GitHub Actions runners

## Security Best Practices

1. **Rotate secrets regularly** - Set up a schedule to rotate credentials every 90 days
2. **Use least privilege** - Service principal should only have necessary permissions
3. **Monitor access** - Enable Azure Monitor and review access logs regularly
4. **Use managed identities** - When possible, prefer managed identities over service principals
5. **Enable secret scanning** - Enable GitHub secret scanning to detect leaked credentials
6. **Audit trail** - Enable audit logging in Azure Key Vault to track secret access

## Helper Script

Run the provided setup script to automate Key Vault configuration:

```bash
# Make script executable (Linux/Mac/Git Bash)
chmod +x scripts/setup-keyvault.sh

# Run the script
./scripts/setup-keyvault.sh
```

The script will:
- Create or verify Key Vault exists
- Add application secrets to Key Vault
- Optionally create service principal
- Display all GitHub secrets you need to configure

## Next Steps

After configuring all secrets:

1. Review the [Deployment Guide](DEPLOYMENT.md) for full setup instructions
2. Test the pipeline with a pull request
3. Monitor the first deployment carefully
4. Set up monitoring and alerts for the deployed application

## Support

If you encounter issues:
- Check the [Deployment Guide](DEPLOYMENT.md) troubleshooting section
- Review GitHub Actions logs for detailed error messages
- Verify Azure resource configurations match the documentation
- Ensure all prerequisites are met
