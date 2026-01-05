# MCP Servers

This directory contains Model Context Protocol (MCP) server implementations for FileVault.

## Files

### Servers
- **`server.js`** - Basic MCP server with FileVault storage tools and resources
- **`devops-server.js`** - DevOps MCP server with Git, Docker, and CI/CD tools

### Test Clients
- **`client-test.js`** - Test client for the basic MCP server
- **`devops-test.js`** - Test client for the DevOps MCP server

### Utilities
- **`deployment-automation.js`** - Deployment automation module with workflow orchestration

## Quick Start

### Run Basic MCP Server
```bash
npm run mcp:server
```

### Test Basic MCP Server
```bash
npm run mcp:test
```

### Run DevOps MCP Server
```bash
npm run mcp:devops
```

### Test DevOps MCP Server
```bash
npm run mcp:devops:test
```

### Deployment Commands
```bash
# Check pre-deployment status
npm run deploy:checks

# Deploy to environments
npm run deploy:dev
npm run deploy:staging
npm run deploy:production
```

## Documentation

Detailed documentation is available in the `docs/` directory:
- **`MCP_GUIDE.md`** - Guide for basic MCP server
- **`DEVOPS_MCP_GUIDE.md`** - Comprehensive DevOps MCP guide

## Architecture

All MCP servers use:
- **Transport**: stdio (standard input/output)
- **Protocol**: JSON-RPC 2.0
- **SDK**: @modelcontextprotocol/sdk

## Development

To extend the servers with new tools:
1. Add tool definition in `ListToolsRequestSchema` handler
2. Implement tool logic in `CallToolRequestSchema` handler
3. Update documentation
4. Add tests to verify functionality
