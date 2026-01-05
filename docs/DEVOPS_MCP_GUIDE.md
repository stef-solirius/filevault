# DevOps MCP Server Guide

## Overview
The DevOps MCP Server provides AI agents with tools to interact with Git, Docker, GitHub Actions, and deployment systems. This enables automated DevOps workflows, repository analysis, container management, and CI/CD pipeline orchestration.

## Architecture

### Components
1. **MCP Server** (`mcp-devops-server.js`) - Exposes DevOps tools via MCP protocol
2. **Deployment Automation** (`deployment-automation.js`) - Reusable deployment workflows
3. **Test Client** (`mcp-devops-test.js`) - Validates server functionality

### Available Tools (15 Total)

#### Git Operations (6 tools)
- `git_status` - Get repository status
- `git_log` - View commit history with filters
- `git_branches` - List branches
- `git_diff` - Show changes between commits/branches
- `git_repo_stats` - Repository statistics
- `git_create_branch` - Create new branches

#### Docker Operations (5 tools)
- `docker_ps` - List containers
- `docker_images` - List images
- `docker_inspect` - Inspect containers/images
- `docker_stats` - Resource usage statistics
- `docker_logs` - Container logs

#### CI/CD Integration (4 tools)
- `github_workflows` - List GitHub Actions workflows
- `github_workflow_runs` - View workflow run history
- `github_trigger_workflow` - Trigger workflows
- `check_deployment_status` - Check deployment status

## Usage

### Starting the Server

```bash
npm run mcp:devops
```

The server runs on stdio and accepts JSON-RPC messages.

### Testing the Server

```bash
npm run mcp:devops:test
```

### Running Deployment Checks

```bash
npm run deploy:checks
```

## Tool Reference

### Git Tools

#### git_status
Get the current status of the repository.

```javascript
await client.callTool({
  name: 'git_status',
  arguments: {
    repo_path: '/path/to/repo' // optional, defaults to current directory
  }
});
```

**Response:**
```json
{
  "status": "## main...origin/main\n M file.txt",
  "repo_path": "/path/to/repo"
}
```

#### git_log
Retrieve commit history with optional filters.

```javascript
await client.callTool({
  name: 'git_log',
  arguments: {
    repo_path: '/path/to/repo',
    limit: 10,
    author: 'john.doe@example.com' // optional
  }
});
```

**Response:**
```json
{
  "commits": [
    {
      "hash": "abc123",
      "author": "John Doe",
      "email": "john.doe@example.com",
      "date": "2024-01-05 10:00:00",
      "message": "feat: Add new feature"
    }
  ],
  "total": 10
}
```

#### git_branches
List all branches in the repository.

```javascript
await client.callTool({
  name: 'git_branches',
  arguments: {
    repo_path: '/path/to/repo',
    include_remote: true // optional, defaults to false
  }
});
```

#### git_diff
Show changes between commits, branches, or working directory.

```javascript
await client.callTool({
  name: 'git_diff',
  arguments: {
    repo_path: '/path/to/repo',
    target: 'main' // optional, compares to working directory if empty
  }
});
```

#### git_repo_stats
Get repository statistics including file count, contributors, and commit count.

```javascript
await client.callTool({
  name: 'git_repo_stats',
  arguments: {
    repo_path: '/path/to/repo'
  }
});
```

**Response:**
```json
{
  "total_files": "150",
  "total_commits": "500",
  "contributors": "10\tJohn Doe\n5\tJane Smith\n...",
  "repo_path": "/path/to/repo"
}
```

#### git_create_branch
Create a new Git branch.

```javascript
await client.callTool({
  name: 'git_create_branch',
  arguments: {
    repo_path: '/path/to/repo',
    branch_name: 'feature/new-feature',
    checkout: true // optional, defaults to false
  }
});
```

### Docker Tools

#### docker_ps
List Docker containers.

```javascript
await client.callTool({
  name: 'docker_ps',
  arguments: {
    all: true // optional, show all containers including stopped
  }
});
```

**Response:**
```json
{
  "containers": [
    {
      "id": "abc123",
      "name": "my-container",
      "status": "Up 2 hours",
      "image": "node:18"
    }
  ],
  "count": 1
}
```

#### docker_images
List Docker images.

```javascript
await client.callTool({
  name: 'docker_images',
  arguments: {
    filter: 'node' // optional, filter by image name
  }
});
```

#### docker_inspect
Inspect a Docker container or image (returns detailed JSON).

```javascript
await client.callTool({
  name: 'docker_inspect',
  arguments: {
    target: 'my-container' // container ID/name or image ID/name
  }
});
```

#### docker_stats
Get resource usage statistics for containers.

```javascript
await client.callTool({
  name: 'docker_stats',
  arguments: {
    container: 'my-container' // optional, leave empty for all containers
  }
});
```

**Response:**
```json
{
  "stats": [
    {
      "container": "my-container",
      "cpu": "0.50%",
      "memory": "256MiB / 8GiB",
      "network": "1.2kB / 2.5kB"
    }
  ]
}
```

#### docker_logs
Get logs from a Docker container.

```javascript
await client.callTool({
  name: 'docker_logs',
  arguments: {
    container: 'my-container',
    tail: 100 // optional, defaults to 100
  }
});
```

### GitHub Actions Tools

#### github_workflows
List GitHub Actions workflows in the repository.

```javascript
await client.callTool({
  name: 'github_workflows',
  arguments: {
    repo_path: '/path/to/repo'
  }
});
```

**Response:**
```json
{
  "workflows": ["ci.yml", "deploy.yml", "test.yml"],
  "count": 3
}
```

#### github_workflow_runs
Get recent workflow runs (requires GitHub CLI).

```javascript
await client.callTool({
  name: 'github_workflow_runs',
  arguments: {
    repo_path: '/path/to/repo',
    limit: 10
  }
});
```

**Prerequisites:**
- Install GitHub CLI: `gh auth login`

#### github_trigger_workflow
Trigger a GitHub Actions workflow (requires GitHub CLI).

```javascript
await client.callTool({
  name: 'github_trigger_workflow',
  arguments: {
    repo_path: '/path/to/repo',
    workflow: 'deploy.yml',
    ref: 'main' // optional, defaults to main
  }
});
```

### Deployment Tools

#### check_deployment_status
Check deployment status (extensible for K8s, ECS, etc.).

```javascript
await client.callTool({
  name: 'check_deployment_status',
  arguments: {
    environment: 'production',
    service: 'api-service'
  }
});
```

**Note:** This is a placeholder that needs integration with your deployment platform.

## Deployment Automation Module

The `deployment-automation.js` module provides reusable deployment workflows.

### CLI Usage

```bash
# Run pre-deployment checks
node deployment-automation.js checks

# Deploy to environment
node deployment-automation.js deploy <environment> <version> [image-name] [workflow-file]

# Rollback deployment
node deployment-automation.js rollback <environment> <version>

# View deployment history
node deployment-automation.js history <environment> [limit]
```

### Examples

```bash
# Check if repository is ready for deployment
npm run deploy:checks

# Deploy to dev environment
npm run deploy:dev

# Deploy to staging with Docker image
node deployment-automation.js deploy staging v1.2.0 myapp/api deploy.yml

# View production deployment history
node deployment-automation.js history production 20

# Rollback to previous version
node deployment-automation.js rollback production v1.1.0
```

### Programmatic Usage

```javascript
const DeploymentAutomation = require('./deployment-automation');

const automation = new DeploymentAutomation({
  repoPath: '/path/to/repo',
  verbose: true
});

// Run deployment
const result = await automation.deploy({
  environment: 'staging',
  version: 'v1.2.0',
  imageName: 'myapp/api',
  dockerfilePath: '.',
  workflowFile: 'deploy.yml',
  skipChecks: false
});

console.log(result);
```

### Deployment Features

#### Pre-deployment Checks
- Working directory status
- Current branch
- Latest commit
- Remote connectivity

#### Docker Integration
- Build Docker images with version tags
- Push images to registry
- Tag with commit hash for traceability

#### Git Tagging
- Create deployment tags: `deploy-{environment}-{version}`
- Push tags to remote
- Track deployment history

#### GitHub Actions Integration
- Trigger workflows programmatically
- Wait for workflow completion
- Pass environment and version as inputs

#### Rollback Support
- Identify previous deployment tags
- Trigger rollback workflows
- Maintain deployment history

## Integration Patterns

### 1. Automated Code Review
```javascript
// Get recent changes
const status = await callTool('git_status');
const diff = await callTool('git_diff');

// Analyze changes and provide feedback
```

### 2. CI/CD Monitoring
```javascript
// Check workflow status
const workflows = await callTool('github_workflows');
const runs = await callTool('github_workflow_runs', { limit: 5 });

// Alert on failures
runs.forEach(run => {
  if (run.conclusion === 'failure') {
    // Send notification
  }
});
```

### 3. Container Health Monitoring
```javascript
// Get container stats
const stats = await callTool('docker_stats');

// Check resource usage
stats.stats.forEach(container => {
  // Alert if CPU or memory is high
});
```

### 4. Automated Deployment Pipeline
```javascript
const automation = new DeploymentAutomation({ verbose: true });

// 1. Run checks
const checks = automation.runPreDeploymentChecks();

// 2. Build and push Docker image
const result = await automation.deploy({
  environment: 'production',
  version: 'v1.2.0',
  imageName: 'myapp/api',
  workflowFile: 'deploy.yml'
});

// 3. Monitor deployment
const runs = await callTool('github_workflow_runs', { limit: 1 });
```

### 5. Repository Analysis
```javascript
// Get repository metrics
const stats = await callTool('git_repo_stats');
const log = await callTool('git_log', { limit: 50 });

// Analyze commit patterns, contributor activity, etc.
```

## Prerequisites

### Required
- Node.js 18+
- Git
- Repository access

### Optional (for full functionality)
- Docker Desktop (for container tools)
- GitHub CLI (`gh`) - for GitHub Actions integration
  ```bash
  # Install and authenticate
  gh auth login
  ```
- Deployment platform CLI (kubectl, aws, az, etc.)

## Security Considerations

1. **Command Execution**: All commands are executed via `execSync` - ensure trusted inputs
2. **Repository Access**: Tools require Git repository access
3. **Docker Socket**: Docker tools need Docker daemon access
4. **GitHub Token**: GitHub CLI requires authentication
5. **Deployment Credentials**: Secure credentials for deployment platforms

## Extending the Server

### Adding a New Git Tool

```javascript
// In ListToolsRequestSchema handler
{
  name: 'git_my_tool',
  description: 'Description of the tool',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter description' }
    }
  }
}

// In CallToolRequestSchema handler
case 'git_my_tool': {
  const result = executeCommand(`git -C "${repoPath}" my-command ${args.param}`);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(result, null, 2)
    }]
  };
}
```

### Adding Kubernetes Support

```javascript
// Add to deployment-automation.js
checkK8sDeployment(namespace, deployment) {
  const result = this.exec(`kubectl get deployment ${deployment} -n ${namespace} -o json`);
  if (result.success) {
    const data = JSON.parse(result.output);
    return {
      replicas: data.spec.replicas,
      available: data.status.availableReplicas,
      ready: data.status.readyReplicas
    };
  }
  throw new Error('Deployment not found');
}
```

## Troubleshooting

### Docker Connection Issues
```
Error: Cannot connect to Docker daemon
```
**Solution:** Start Docker Desktop or Docker daemon

### GitHub CLI Not Authenticated
```
Error: gh CLI not available or not authenticated
```
**Solution:** Run `gh auth login`

### Git Command Failures
```
Error: Git status failed
```
**Solution:** Ensure you're in a Git repository and have proper access

## Next Steps

- Add Kubernetes deployment tools
- Integrate with AWS ECS/EKS
- Add Azure Container Apps support
- Implement deployment health checks
- Add rollback automation
- Create deployment metrics dashboard
- Add Slack/Teams notifications
- Implement blue-green deployments
- Add canary deployment support

## References

- [Git Documentation](https://git-scm.com/doc)
- [Docker CLI Reference](https://docs.docker.com/engine/reference/commandline/cli/)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [MCP Specification](https://modelcontextprotocol.io)
