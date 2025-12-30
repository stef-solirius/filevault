# Azure Key Vault Setup Script for FileVault
# This script helps configure secrets in Azure Key Vault for the CD pipeline

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "FileVault - Key Vault Setup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if Azure CLI is installed
function Test-AzureCLI {
    try {
        az version | Out-Null
        return $true
    }
    catch {
        Write-Host "Error: Azure CLI is not installed." -ForegroundColor Red
        Write-Host "Please install it from: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    }
}

# Function to check if user is logged in
function Test-AzureLogin {
    try {
        az account show 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw
        }
        return $true
    }
    catch {
        Write-Host "You are not logged in to Azure." -ForegroundColor Red
        Write-Host "Please run: az login"
        exit 1
    }
}

# Get user inputs
function Get-UserInputs {
    Write-Host "Please provide the following information:" -ForegroundColor Yellow
    Write-Host ""
    
    $script:RESOURCE_GROUP = Read-Host "Resource Group Name"
    $script:KEY_VAULT_NAME = Read-Host "Key Vault Name"
    $locationInput = Read-Host "Location (default: uksouth)"
    $script:LOCATION = if ($locationInput) { $locationInput } else { "uksouth" }
    
    Write-Host ""
    Write-Host "Storage Account Configuration:" -ForegroundColor Yellow
    $script:STORAGE_ACCOUNT_NAME = Read-Host "Azure Storage Account Name"
    $script:STORAGE_ACCOUNT_KEY = Read-Host "Azure Storage Account Key" -AsSecureString
    $script:STORAGE_ACCOUNT_KEY_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($script:STORAGE_ACCOUNT_KEY))
    $script:CONTAINER_NAME = Read-Host "Azure Container Name"
    
    Write-Host ""
}

# Create Key Vault if it doesn't exist
function New-KeyVaultIfNotExists {
    Write-Host "Checking if Key Vault '$KEY_VAULT_NAME' exists..." -ForegroundColor Yellow
    
    $kvExists = az keyvault show --name $KEY_VAULT_NAME --resource-group $RESOURCE_GROUP 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Key Vault already exists." -ForegroundColor Green
    }
    else {
        Write-Host "Creating Key Vault '$KEY_VAULT_NAME'..." -ForegroundColor Yellow
        az keyvault create `
            --name $KEY_VAULT_NAME `
            --resource-group $RESOURCE_GROUP `
            --location $LOCATION `
            --enable-rbac-authorization false
        Write-Host "Key Vault created successfully." -ForegroundColor Green
    }
    Write-Host ""
}

# Add secrets to Key Vault
function Add-SecretsToKeyVault {
    Write-Host "Adding secrets to Key Vault..." -ForegroundColor Yellow
    
    Write-Host "  - Adding AZURE-STORAGE-ACCOUNT-NAME..." -ForegroundColor Gray
    az keyvault secret set `
        --vault-name $KEY_VAULT_NAME `
        --name AZURE-STORAGE-ACCOUNT-NAME `
        --value $STORAGE_ACCOUNT_NAME `
        --output none
    
    Write-Host "  - Adding AZURE-STORAGE-ACCOUNT-KEY..." -ForegroundColor Gray
    az keyvault secret set `
        --vault-name $KEY_VAULT_NAME `
        --name AZURE-STORAGE-ACCOUNT-KEY `
        --value $STORAGE_ACCOUNT_KEY_PLAIN `
        --output none
    
    Write-Host "  - Adding AZURE-CONTAINER-NAME..." -ForegroundColor Gray
    az keyvault secret set `
        --vault-name $KEY_VAULT_NAME `
        --name AZURE-CONTAINER-NAME `
        --value $CONTAINER_NAME `
        --output none
    
    Write-Host "Secrets added successfully." -ForegroundColor Green
    Write-Host ""
}

# Create service principal for GitHub Actions
function New-ServicePrincipal {
    Write-Host "Creating Service Principal for GitHub Actions..." -ForegroundColor Yellow
    Write-Host ""
    
    $createSP = Read-Host "Do you want to create a service principal for GitHub Actions? (y/n)"
    
    if ($createSP -eq "y" -or $createSP -eq "Y") {
        $SUBSCRIPTION_ID = az account show --query id -o tsv
        
        Write-Host "Creating service principal..." -ForegroundColor Yellow
        $SP_OUTPUT = az ad sp create-for-rbac `
            --name "github-actions-filevault" `
            --role contributor `
            --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" `
            --sdk-auth
        
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "Service Principal Created" -ForegroundColor Cyan
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Copy the following JSON and add it as a GitHub secret named 'AZURE_CREDENTIALS':" -ForegroundColor Yellow
        Write-Host ""
        Write-Host $SP_OUTPUT -ForegroundColor White
        Write-Host ""
        
        # Get the service principal object ID and grant Key Vault access
        Start-Sleep -Seconds 10  # Wait for SP propagation
        Write-Host "Granting Key Vault access to service principal..." -ForegroundColor Yellow
        
        $SP_APP_ID = ($SP_OUTPUT | ConvertFrom-Json).clientId
        $SP_OBJECT_ID = az ad sp show --id $SP_APP_ID --query id -o tsv
        
        az keyvault set-policy `
            --name $KEY_VAULT_NAME `
            --object-id $SP_OBJECT_ID `
            --secret-permissions get list
        
        Write-Host "Service principal granted Key Vault access." -ForegroundColor Green
        Write-Host ""
        
        $script:SP_CREATED = $true
    }
    else {
        $script:SP_CREATED = $false
    }
}

# Display GitHub secrets summary
function Show-Summary {
    $ACR_CREDS = az acr credential show --name filevaultregistry2025 2>$null
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Setup Complete!" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Add the following secrets to your GitHub repository:" -ForegroundColor Yellow
    Write-Host "(Settings > Secrets and variables > Actions > New repository secret)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "1. ACR_LOGIN_SERVER" -ForegroundColor White
    Write-Host "   Value: filevaultregistry2025.azurecr.io" -ForegroundColor Gray
    Write-Host ""
    
    if ($LASTEXITCODE -eq 0 -and $ACR_CREDS) {
        $acrJson = $ACR_CREDS | ConvertFrom-Json
        $ACR_USERNAME = $acrJson.username
        $ACR_PASSWORD = $acrJson.passwords[0].value
        
        Write-Host "2. ACR_USERNAME" -ForegroundColor White
        Write-Host "   Value: $ACR_USERNAME" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. ACR_PASSWORD" -ForegroundColor White
        Write-Host "   Value: $ACR_PASSWORD" -ForegroundColor Gray
        Write-Host ""
    }
    else {
        Write-Host "2. ACR_USERNAME" -ForegroundColor White
        Write-Host "   Value: (Run 'az acr credential show --name filevaultregistry2025')" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. ACR_PASSWORD" -ForegroundColor White
        Write-Host "   Value: (Run 'az acr credential show --name filevaultregistry2025')" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "4. AZURE_WEBAPP_NAME" -ForegroundColor White
    Write-Host "   Value: filevault-app" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. KEY_VAULT_NAME" -ForegroundColor White
    Write-Host "   Value: $KEY_VAULT_NAME" -ForegroundColor Gray
    Write-Host ""
    Write-Host "6. SONAR_TOKEN" -ForegroundColor White
    Write-Host "   Value: <your-sonarqube-token>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "7. SONAR_HOST_URL" -ForegroundColor White
    Write-Host "   Value: <your-sonarqube-url>" -ForegroundColor Gray
    Write-Host ""
    
    if ($script:SP_CREATED) {
        Write-Host "8. AZURE_CREDENTIALS" -ForegroundColor White
        Write-Host "   Value: (JSON output shown above)" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "For detailed setup instructions, see:" -ForegroundColor Yellow
    Write-Host "docs/DEPLOYMENT.md" -ForegroundColor Gray
    Write-Host "==========================================" -ForegroundColor Cyan
}

# Main execution
function Main {
    Test-AzureCLI
    Test-AzureLogin
    Get-UserInputs
    New-KeyVaultIfNotExists
    Add-SecretsToKeyVault
    New-ServicePrincipal
    Show-Summary
}

# Run the script
Main
