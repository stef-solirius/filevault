# CI/CD Pipeline Overview

This document provides a quick reference for the FileVault CI/CD pipeline.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         TRIGGER                                  │
│  Push to main/develop   OR   Pull Request to main/develop       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTINUOUS INTEGRATION                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐      ┌──────────┐      ┌──────────────┐          │
│  │   Lint   │─────▶│   Test   │─────▶│  SonarQube   │          │
│  │          │      │          │      │   Analysis   │          │
│  └──────────┘      └──────────┘      └──────────────┘          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Build Status │
                   │    Check     │
                   └──────┬───────┘
                          │
                          ▼
              ┌──────────────────────┐
              │  Main Branch Only?   │
              └──────┬───────────────┘
                     │ Yes
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTINUOUS DEPLOYMENT                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐      ┌─────────────────────┐             │
│  │  Build & Push    │─────▶│      Deploy to      │             │
│  │  Docker Image    │      │  Azure App Service  │             │
│  │   to ACR         │      │   with Key Vault    │             │
│  └──────────────────┘      └─────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Pipeline Stages

### Stage 1: Linting
**Purpose**: Ensure code quality and consistency

**Actions**:
- Checkout code
- Setup Node.js 18
- Install dependencies
- Run ESLint on all source files

**Runs on**: All branches (main, develop, PRs)

---

### Stage 2: Testing
**Purpose**: Validate application functionality

**Actions**:
- Checkout code
- Setup Node.js 18
- Install dependencies
- Run Jest tests with coverage
- Upload coverage reports as artifacts

**Runs on**: All branches (main, develop, PRs)

**Dependencies**: Requires lint stage to pass

---

### Stage 3: SonarQube Analysis
**Purpose**: Perform static code analysis and quality gate checks

**Actions**:
- Checkout code (full history for analysis)
- Setup Node.js 18
- Install dependencies
- Run tests to generate coverage
- Execute SonarQube scan
- Check quality gate status

**Runs on**: All branches (main, develop, PRs)

**Dependencies**: Requires test stage to pass

**Required Secrets**:
- `SONAR_TOKEN`
- `SONAR_HOST_URL`

---

### Stage 4: Build Status Check
**Purpose**: Validate all CI stages passed

**Actions**:
- Check results from lint, test, and sonarqube jobs
- Fail if any previous job failed
- Report overall build status

**Duration**: ~10 seconds

**Runs on**: All branches (always runs regardless of previous failures)

**Dependencies**: Runs after lint, test, and sonarqube

---

### Stage 5: Build and Push
**Purpose**: Build Docker image and push to Azure Container Registry

**Actions**:
- Checkout code
- Setup Docker Buildx
- Login to Azure Container Registry
- Build Docker image from `config/Dockerfile`
- Tag with `latest` and Git SHA
- Push to ACR with build cache optimization

**Runs on**: **main branch only** (on push)

**Dependencies**: Requires all CI stages to pass

**Required Secrets**:
- `ACR_LOGIN_SERVER`
- `ACR_USERNAME`
- `ACR_PASSWORD`

**Artifacts**:
- Docker image: `{ACR}/filevault:latest`
- Docker image: `{ACR}/filevault:{git-sha}`

---

### Stage 6: Deploy
**Purpose**: Deploy application to Azure App Service

**Actions**:
- Checkout code
- Login to Azure using service principal
- Retrieve secrets from Azure Key Vault
- Deploy Docker image to Azure Web App
- Configure App Settings with secrets
- Logout from Azure

**Duration**: ~2-4 minutes

**Runs on**: **main branch only** (on push)

**Environment**: production

**Dependencies**: Requires build-and-push stage to complete

**Required Secrets**:
- `AZURE_CREDENTIALS`
- `AZURE_WEBAPP_NAME`
- `KEY_VAULT_NAME`

**Key Vault Secrets Retrieved**:
- `AZURE-STORAGE-ACCOUNT-NAME`
- `AZURE-STORAGE-ACCOUNT-KEY`
- `AZURE-CONTAINER-NAME`

**Deployment URL**: Available in deployment logs and environment

---

## Trigger Conditions

### Pull Requests
- **Branches**: Targeting `main` or `develop`
- **Stages**: Lint, Test, SonarQube, Build Status
- **No Deployment**: Build and deploy stages are skipped

### Push to Develop
- **Stages**: Lint, Test, SonarQube, Build Status
- **No Deployment**: Build and deploy stages are skipped

### Push to Main
- **Stages**: All stages including Build and Deploy
- **Full Pipeline**: Complete CI/CD execution
- **Result**: Application deployed to production

## Status Badges

Add these badges to your README to show pipeline status:

```markdown
![CI Pipeline](https://github.com/yourusername/filevault/actions/workflows/ci.yml/badge.svg?branch=main)
```

## Monitoring Pipeline Runs

### View Pipeline Status
1. Go to repository **Actions** tab
2. Select **CI Pipeline** workflow
3. View recent runs and their status

### View Logs
1. Click on a specific workflow run
2. Click on a job (e.g., "Lint", "Deploy")
3. Expand steps to view detailed logs

### Download Artifacts
1. Navigate to a completed workflow run
2. Scroll to **Artifacts** section
3. Download coverage reports or other artifacts

## Pipeline Failure Scenarios

### Lint Failure
**Symptom**: Red X on lint stage

**Common Causes**:
- ESLint rule violations
- Syntax errors in JavaScript files

**Resolution**:
- Run `npm run lint` locally
- Fix reported issues
- Run `npm run lint:fix` for auto-fixable issues

---

### Test Failure
**Symptom**: Red X on test stage

**Common Causes**:
- Failing test cases
- Missing test dependencies
- Environment configuration issues

**Resolution**:
- Run `npm test` locally
- Review failing test output
- Fix code or update tests

---

### SonarQube Failure
**Symptom**: Red X on sonarqube stage

**Common Causes**:
- Code quality gate not met
- Code coverage below threshold
- Critical bugs or vulnerabilities detected

**Resolution**:
- Review SonarQube report
- Address identified issues
- Improve test coverage if needed

---

### Build Failure
**Symptom**: Red X on build-and-push stage

**Common Causes**:
- Docker build errors
- Missing files referenced in Dockerfile
- ACR authentication issues

**Resolution**:
- Test Docker build locally: `docker build -f config/Dockerfile .`
- Verify ACR credentials in GitHub secrets
- Check Dockerfile paths and syntax

---

### Deployment Failure
**Symptom**: Red X on deploy stage

**Common Causes**:
- Azure authentication issues
- Key Vault access denied
- Web App configuration errors
- Image pull failures

**Resolution**:
- Verify `AZURE_CREDENTIALS` is valid
- Check service principal has Key Vault access
- Verify Web App is configured correctly
- Ensure ACR credentials are set in Web App

## Manual Interventions

### Cancel Running Pipeline
1. Go to **Actions** tab
2. Click on running workflow
3. Click **Cancel workflow** button

### Re-run Failed Pipeline
1. Go to failed workflow run
2. Click **Re-run jobs** dropdown
3. Select **Re-run failed jobs** or **Re-run all jobs**

### Skip CI for a Commit
Add `[skip ci]` or `[ci skip]` to commit message:
```bash
git commit -m "Update documentation [skip ci]"
```

## Best Practices

1. **Always run lint and test locally** before pushing
2. **Create feature branches** for development work
3. **Use pull requests** for code review before merging to main
4. **Monitor pipeline runs** and fix failures promptly
5. **Keep secrets up to date** and rotate regularly
6. **Review SonarQube reports** to maintain code quality
7. **Test Docker builds locally** before pushing
8. **Use staging environment** for testing before production (future enhancement)

## Troubleshooting Commands

### Local Testing
```bash
# Run linting
npm run lint

# Run tests with coverage
npm test

# Build Docker image locally
docker build -f config/Dockerfile -t filevault:test .

# Run container locally
docker run -p 3000:3000 --env-file .env filevault:test
```

### Azure CLI Verification
```bash
# Check Azure login
az account show

# List Web Apps
az webapp list -o table

# View Web App logs
az webapp log tail --name <webapp-name> --resource-group <resource-group-name>

# Test Key Vault access
az keyvault secret list --vault-name <keyvault-name>
```

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md) - Full Azure setup instructions
- [Secrets Configuration](SECRETS_TEMPLATE.md) - GitHub secrets checklist
- [Main README](../README.md) - Project overview and local setup

## Support

For issues or questions about the pipeline:
1. Check this documentation first
2. Review GitHub Actions logs for error details
3. Verify all secrets are configured correctly
4. Ensure Azure resources are properly set up
5. Consult the Deployment Guide for detailed troubleshooting
