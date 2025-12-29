# CI/CD Setup Script for FileVault
# This script installs all necessary dependencies for the CI/CD pipeline

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FileVault CI/CD Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js v18 or higher." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "ERROR: npm is not installed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing root dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Root dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to install root dependencies." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing AWS S3 dependencies..." -ForegroundColor Yellow
Push-Location src\aws-s3
npm install
$awsInstallResult = $LASTEXITCODE
Pop-Location

if ($awsInstallResult -eq 0) {
    Write-Host "AWS S3 dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Failed to install AWS S3 dependencies." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing Azure SA dependencies..." -ForegroundColor Yellow
Push-Location src\azure-sa
npm install
$azureInstallResult = $LASTEXITCODE
Pop-Location

if ($azureInstallResult -eq 0) {
    Write-Host "Azure SA dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Failed to install Azure SA dependencies." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm run lint' to check code quality" -ForegroundColor White
Write-Host "2. Run 'npm test' to execute tests" -ForegroundColor White
Write-Host "3. Configure SonarQube secrets in GitHub (see CI-CD-SETUP.md)" -ForegroundColor White
Write-Host "4. Push to main or develop branch to trigger the pipeline" -ForegroundColor White
Write-Host ""
Write-Host "For more information, see CI-CD-SETUP.md" -ForegroundColor Cyan
