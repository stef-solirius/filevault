#!/bin/bash

# Azure Key Vault Setup Script for FileVault
# This script helps configure secrets in Azure Key Vault for the CD pipeline

set -e

echo "=========================================="
echo "FileVault - Key Vault Setup Script"
echo "=========================================="
echo ""

# Function to check if Azure CLI is installed
check_azure_cli() {
    if ! command -v az &> /dev/null; then
        echo "Error: Azure CLI is not installed."
        echo "Please install it from: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi
}

# Function to check if user is logged in
check_login() {
    if ! az account show &> /dev/null; then
        echo "You are not logged in to Azure."
        echo "Please run: az login"
        exit 1
    fi
}

# Get user inputs
get_inputs() {
    echo "Please provide the following information:"
    echo ""
    
    read -p "Resource Group Name: " RESOURCE_GROUP
    read -p "Key Vault Name: " KEY_VAULT_NAME
    read -p "Location (default: uksouth): " LOCATION
    LOCATION=${LOCATION:-uksouth}
    
    echo ""
    echo "Storage Account Configuration:"
    read -p "Azure Storage Account Name: " STORAGE_ACCOUNT_NAME
    read -sp "Azure Storage Account Key: " STORAGE_ACCOUNT_KEY
    echo ""
    read -p "Azure Container Name: " CONTAINER_NAME
    
    echo ""
}

# Create Key Vault if it doesn't exist
create_keyvault() {
    echo "Checking if Key Vault '$KEY_VAULT_NAME' exists..."
    
    if az keyvault show --name "$KEY_VAULT_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        echo "Key Vault already exists."
    else
        echo "Creating Key Vault '$KEY_VAULT_NAME'..."
        az keyvault create \
            --name "$KEY_VAULT_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --location "$LOCATION" \
            --enable-rbac-authorization false
        echo "Key Vault created successfully."
    fi
    echo ""
}

# Add secrets to Key Vault
add_secrets() {
    echo "Adding secrets to Key Vault..."
    
    echo "  - Adding AZURE-STORAGE-ACCOUNT-NAME..."
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name AZURE-STORAGE-ACCOUNT-NAME \
        --value "$STORAGE_ACCOUNT_NAME" \
        --output none
    
    echo "  - Adding AZURE-STORAGE-ACCOUNT-KEY..."
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name AZURE-STORAGE-ACCOUNT-KEY \
        --value "$STORAGE_ACCOUNT_KEY" \
        --output none
    
    echo "  - Adding AZURE-CONTAINER-NAME..."
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name AZURE-CONTAINER-NAME \
        --value "$CONTAINER_NAME" \
        --output none
    
    echo "Secrets added successfully."
    echo ""
}

# Create service principal for GitHub Actions
create_service_principal() {
    echo "Creating Service Principal for GitHub Actions..."
    echo ""
    
    read -p "Do you want to create a service principal for GitHub Actions? (y/n): " CREATE_SP
    
    if [[ "$CREATE_SP" == "y" || "$CREATE_SP" == "Y" ]]; then
        SUBSCRIPTION_ID=$(az account show --query id -o tsv)
        
        echo "Creating service principal..."
        SP_OUTPUT=$(az ad sp create-for-rbac \
            --name "github-actions-filevault" \
            --role contributor \
            --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
            --sdk-auth)
        
        echo ""
        echo "=========================================="
        echo "Service Principal Created"
        echo "=========================================="
        echo ""
        echo "Copy the following JSON and add it as a GitHub secret named 'AZURE_CREDENTIALS':"
        echo ""
        echo "$SP_OUTPUT"
        echo ""
        
        # Get the service principal object ID and grant Key Vault access
        sleep 10  # Wait for SP propagation
        echo "Granting Key Vault access to service principal..."
        
        SP_APP_ID=$(echo "$SP_OUTPUT" | grep -o '"clientId": "[^"]*' | cut -d'"' -f4)
        SP_OBJECT_ID=$(az ad sp show --id "$SP_APP_ID" --query id -o tsv)
        
        az keyvault set-policy \
            --name "$KEY_VAULT_NAME" \
            --object-id "$SP_OBJECT_ID" \
            --secret-permissions get list
        
        echo "Service principal granted Key Vault access."
        echo ""
    fi
}

# Display GitHub secrets summary
display_summary() {
    ACR_CREDS=$(az acr credential show --name filevaultregistry2025 2>/dev/null || echo "Not found")
    
    echo "=========================================="
    echo "Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Add the following secrets to your GitHub repository:"
    echo "(Settings > Secrets and variables > Actions > New repository secret)"
    echo ""
    echo "1. ACR_LOGIN_SERVER"
    echo "   Value: filevaultregistry2025.azurecr.io"
    echo ""
    
    if [[ "$ACR_CREDS" != "Not found" ]]; then
        ACR_USERNAME=$(echo "$ACR_CREDS" | grep -o '"username": "[^"]*' | cut -d'"' -f4)
        ACR_PASSWORD=$(echo "$ACR_CREDS" | grep -o '"passwords"' -A 10 | grep -o '"value": "[^"]*' | head -1 | cut -d'"' -f4)
        
        echo "2. ACR_USERNAME"
        echo "   Value: $ACR_USERNAME"
        echo ""
        echo "3. ACR_PASSWORD"
        echo "   Value: $ACR_PASSWORD"
        echo ""
    else
        echo "2. ACR_USERNAME"
        echo "   Value: (Run 'az acr credential show --name filevaultregistry2025')"
        echo ""
        echo "3. ACR_PASSWORD"
        echo "   Value: (Run 'az acr credential show --name filevaultregistry2025')"
        echo ""
    fi
    
    echo "4. AZURE_WEBAPP_NAME"
    echo "   Value: <your-webapp-name>"
    echo ""
    echo "5. KEY_VAULT_NAME"
    echo "   Value: $KEY_VAULT_NAME"
    echo ""
    echo "6. SONAR_TOKEN"
    echo "   Value: <your-sonarqube-token>"
    echo ""
    echo "7. SONAR_HOST_URL"
    echo "   Value: <your-sonarqube-url>"
    echo ""
    
    if [[ "$CREATE_SP" == "y" || "$CREATE_SP" == "Y" ]]; then
        echo "8. AZURE_CREDENTIALS"
        echo "   Value: (JSON output shown above)"
        echo ""
    fi
    
    echo "=========================================="
    echo "For detailed setup instructions, see:"
    echo "docs/DEPLOYMENT.md"
    echo "=========================================="
}

# Main execution
main() {
    check_azure_cli
    check_login
    get_inputs
    create_keyvault
    add_secrets
    create_service_principal
    display_summary
}

main
