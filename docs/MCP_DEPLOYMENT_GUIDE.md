# MCP Server CI/CD Integration Guide

## Overview
This guide explains how MCP servers are integrated into the FileVault CI/CD pipeline for testing and validation.

**Important**: MCP (Model Context Protocol) servers are designed to run **locally** on developer machines or AI assistant environments using stdio (standard input/output). They are **not** deployed as web services. The CI/CD pipeline validates MCP functionality, but deployment is manual for local use.

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
- **Main Application**: Builds FileVault API Docker image and deploys to Azure

#### 6. Deploy
- **Main Application**: Deploys to Azure App Service
- **MCP Servers**: Not deployed (run locally only)

## Docker Images

### Main Application Image
- **Registry**: `<ACR_LOGIN_SERVER>/filevault:latest`
- **Tag**: Also tagged with commit SHA
- **Dockerfile**: `config/Dockerfile`
- **Deployment**: Azure App Service

### MCP Servers Image (Local Development Only)
- **Dockerfile**: `config/Dockerfile.mcp`
- **Build manually**: `docker build -f config/Dockerfile.mcp -t filevault-mcp:latest .`
- **Usage**: Local development and distribution to team members
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

## MCP Server Usage

### Local Development
MCP servers run locally on your development machine:

```bash
# Run basic MCP server
npm run mcp:server

# Run DevOps MCP server
npm run mcp:devops
```

### AI Assistant Integration
Configure your AI assistant (Claude Desktop, etc.) to use the MCP servers:

```json
{
  "mcpServers": {
    "filevault": {
      "command": "node",
      "args": ["path/to/filevault/mcp/server.js"]
    },
    "filevault-devops": {
      "command": "node",
      "args": ["path/to/filevault/mcp/devops-server.js"]
    }
  }
}
```

## Running MCP Servers with Docker (Optional)

For containerized local development:

### Build the Image
```bash
docker build -f config/Dockerfile.mcp -t filevault-mcp:latest .
```

### Run Basic MCP Server
```bash
docker run -i filevault-mcp:latest node mcp/server.js
```

### Run DevOps MCP Server
```bash
docker run -i filevault-mcp:latest node mcp/devops-server.js
```

Note: The `-i` flag is important for stdio communication.

## Monitoring MCP Servers

### Local Logs
MCP servers output to stderr for status messages:
```bash
# Run with output
npm run mcp:server
# Output: "FileVault MCP Server running on stdio"
```

### Debugging
Use Node.js debugging capabilities:
```bash
node --inspect mcp/server.js
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

### MCP Server Not Responding
- Verify Node.js and npm are installed
- Check that all dependencies are installed: `npm install`
- Ensure Git is installed (for DevOps MCP server)
- Check stdio communication is not blocked

## Security Considerations

### Secrets Management
- Never commit secrets to repository
- Use GitHub Secrets for CI/CD variables
- Use Azure Key Vault for runtime secrets

### Access Control
- Limit GitHub Actions permissions
- MCP servers run locally and don't expose network endpoints
- Secure repository access to prevent unauthorized code changes

## Best Practices

1. **Versioning**: Always tag images with commit SHA for traceability
2. **Testing**: Run all tests locally before pushing
3. **Monitoring**: Set up alerts for deployment failures
4. **Documentation**: Keep deployment docs up to date
5. **Backups**: Maintain backup of configuration and secrets

## Next Steps

- [ ] Add more MCP tools for FileVault operations
- [ ] Integrate MCP servers with Claude Desktop
- [ ] Create MCP server distribution package
- [ ] Add telemetry for tool usage analytics
- [ ] Implement rate limiting for tool calls
- [ ] Add caching for expensive operations

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Docker Documentation](https://docs.docker.com/)
- [MCP Specification](https://modelcontextprotocol.io)
