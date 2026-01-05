# MCP Server Deployment Guide

## Overview
This guide explains how MCP servers are integrated into the FileVault CI/CD pipeline and deployed to Azure.

## CI/CD Pipeline Integration

### Pipeline Stages

The MCP servers are fully integrated into the GitHub Actions CI/CD pipeline with the following stages:

```
┌─────────┐
│  Lint   │
└────┬────┘
     │
     ├──────────┬──────────────┐
     │          │              │
┌────▼────┐ ┌──▼──────────┐   │
│  Test   │ │  Test MCP   │   │
└────┬────┘ └──────┬──────┘   │
     │             │           │
     └──────┬──────┘           │
            │                  │
     ┌──────▼──────────┐       │
     │   SonarQube     │       │
     └──────┬──────────┘       │
            │                  │
     ┌──────▼──────────────────▼────┐
     │  Build & Push (Main + MCP)   │
     └──────┬──────────────────┬────┘
            │                  │
     ┌──────▼──────┐    ┌──────▼──────┐
     │   Deploy    │    │ Deploy MCP  │
     │   Main App  │    │   Servers   │
     └─────────────┘    └─────────────┘
```

### Jobs

#### 1. Lint
Standard ESLint checks for code quality.

#### 2. Test
Unit and integration tests for the main application.

#### 3. Test MCP
Dedicated MCP server testing:
- Basic MCP server functionality test
- DevOps MCP server test
- Deployment checks validation

#### 4. SonarQube Analysis
Code quality and security analysis (depends on both test jobs).

#### 5. Build and Push
Two parallel build jobs:
- **Main Application**: Builds FileVault API Docker image
- **MCP Servers**: Builds MCP servers Docker image

#### 6. Deploy
Two parallel deployment jobs:
- **Main Application**: Deploys to Azure App Service
- **MCP Servers**: Deploys MCP servers to dedicated Azure App Service

## Docker Images

### Main Application Image
- **Registry**: `<ACR_LOGIN_SERVER>/filevault:latest`
- **Tag**: Also tagged with commit SHA
- **Dockerfile**: `config/Dockerfile`

### MCP Servers Image
- **Registry**: `<ACR_LOGIN_SERVER>/filevault-mcp:latest`
- **Tag**: Also tagged with commit SHA
- **Dockerfile**: `config/Dockerfile.mcp`
- **Contents**:
  - Node.js 18 Alpine
  - Git (for DevOps operations)
  - MCP SDK and dependencies
  - All MCP server files
  - Documentation

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Azure Container Registry
- `ACR_LOGIN_SERVER` - Azure Container Registry server URL
- `ACR_USERNAME` - ACR username
- `ACR_PASSWORD` - ACR password

### Azure Deployment
- `AZURE_CREDENTIALS` - Azure service principal credentials (JSON)
- `AZURE_WEBAPP_NAME` - Main application web app name
- `AZURE_MCP_WEBAPP_NAME` - MCP servers web app name

### Code Quality
- `SONAR_TOKEN` - SonarQube authentication token
- `SONAR_HOST_URL` - SonarQube server URL

## Deployment Triggers

### Automatic Deployment
Deployments are triggered automatically on:
- Push to `main` branch (after all tests pass)

### Manual Deployment
Trigger manually using GitHub CLI:
```bash
gh workflow run cicd.yml --ref main
```

## Environment Configuration

### Production Environment
- **Name**: `production` (main app)
- **Name**: `mcp-production` (MCP servers)
- **Protection Rules**: Recommended to add manual approval

### Environment Variables
Configure in Azure App Service settings:

#### MCP Server Variables
```
NODE_ENV=production
MCP_SERVER_PORT=3001
```

#### Optional Variables
```
# For GitHub Actions integration (DevOps MCP)
GITHUB_TOKEN=<token>

# For container operations (if needed)
DOCKER_HOST=<host>
```

## Running Different MCP Servers

The Docker image can run different MCP servers by overriding the CMD:

### Basic MCP Server (default)
```bash
docker run <ACR_LOGIN_SERVER>/filevault-mcp:latest
```

### DevOps MCP Server
```bash
docker run <ACR_LOGIN_SERVER>/filevault-mcp:latest node mcp/devops-server.js
```

## Health Checks

The MCP server image includes a health check script:
```bash
node healthcheck.js
```

Configure in Azure App Service:
- **Path**: `/health` (if HTTP endpoint is implemented)
- **Interval**: 30 seconds
- **Timeout**: 5 seconds

## Monitoring

### Application Insights
The MCP servers can integrate with Azure Application Insights:

```javascript
// Add to server files
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectExceptions(true)
  .start();
```

### Logs
View logs in Azure:
```bash
az webapp log tail --name <AZURE_MCP_WEBAPP_NAME> --resource-group <RESOURCE_GROUP>
```

## Scaling

### Horizontal Scaling
Configure in Azure App Service:
- Scale out to multiple instances
- Use Azure Load Balancer

### Vertical Scaling
Adjust the App Service Plan tier based on requirements.

## Rollback

### Automatic Rollback
If deployment fails, Azure automatically rolls back to the previous version.

### Manual Rollback
```bash
# List deployment history
az webapp deployment list --name <AZURE_MCP_WEBAPP_NAME> --resource-group <RESOURCE_GROUP>

# Rollback to specific deployment
az webapp deployment list-publishing-credentials --name <AZURE_MCP_WEBAPP_NAME> --resource-group <RESOURCE_GROUP>
```

Or use deployment tags:
```bash
# Deploy previous version
az webapp config container set \
  --name <AZURE_MCP_WEBAPP_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --docker-custom-image-name <ACR_LOGIN_SERVER>/filevault-mcp:<previous-sha>
```

## Local Development

### Build MCP Docker Image Locally
```bash
docker build -f config/Dockerfile.mcp -t filevault-mcp:dev .
```

### Run Locally
```bash
docker run -p 3001:3001 filevault-mcp:dev
```

### Test Locally
```bash
# Test basic server
npm run mcp:test

# Test DevOps server
npm run mcp:devops:test
```

## Troubleshooting

### Build Fails
- Check Dockerfile syntax
- Ensure all files are committed (mcp/, docs/, etc.)
- Verify npm dependencies are installed

### Tests Fail in CI
- Run tests locally first: `npm run mcp:test` and `npm run mcp:devops:test`
- Check for environment-specific issues (Git not available, etc.)

### Deployment Fails
- Verify Azure credentials in GitHub secrets
- Check Azure App Service logs
- Ensure container registry is accessible from Azure

### MCP Server Not Responding
- Check health endpoint
- Review Application Insights logs
- Verify environment variables are set correctly

## Security Considerations

### Secrets Management
- Never commit secrets to repository
- Use GitHub Secrets for CI/CD variables
- Use Azure Key Vault for runtime secrets

### Network Security
- Configure Azure App Service network restrictions
- Use private endpoints for ACR
- Enable HTTPS only

### Access Control
- Limit GitHub Actions permissions
- Use Azure RBAC for resource access
- Implement authentication for MCP endpoints (if exposed publicly)

## Best Practices

1. **Versioning**: Always tag images with commit SHA for traceability
2. **Testing**: Run all tests locally before pushing
3. **Monitoring**: Set up alerts for deployment failures
4. **Documentation**: Keep deployment docs up to date
5. **Backups**: Maintain backup of configuration and secrets

## Next Steps

- [ ] Implement HTTP health endpoint in MCP servers
- [ ] Add Application Insights telemetry
- [ ] Set up deployment approval gates
- [ ] Configure auto-scaling rules
- [ ] Add deployment notifications (Slack/Teams)
- [ ] Implement blue-green deployment strategy
- [ ] Set up staging environment for MCP servers

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Docker Documentation](https://docs.docker.com/)
- [MCP Specification](https://modelcontextprotocol.io)
