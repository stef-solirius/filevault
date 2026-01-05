const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function testDevOpsServer() {
  console.log('Starting DevOps MCP Server Test...\n');

  const client = new Client(
    {
      name: 'devops-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['mcp-devops-server.js'],
  });

  try {
    await client.connect(transport);
    console.log('✓ Connected to DevOps MCP server\n');

    // Test: List available tools
    console.log('=== Listing Available Tools ===');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Test: Git Status
    console.log('=== Testing: Git Status ===');
    const statusResult = await client.callTool({
      name: 'git_status',
      arguments: {},
    });
    console.log(statusResult.content[0].text);
    console.log();

    // Test: Git Log
    console.log('=== Testing: Git Log (last 5 commits) ===');
    const logResult = await client.callTool({
      name: 'git_log',
      arguments: { limit: 5 },
    });
    console.log(logResult.content[0].text);
    console.log();

    // Test: Git Branches
    console.log('=== Testing: Git Branches ===');
    const branchesResult = await client.callTool({
      name: 'git_branches',
      arguments: {},
    });
    console.log(branchesResult.content[0].text);
    console.log();

    // Test: Git Repo Stats
    console.log('=== Testing: Git Repository Statistics ===');
    const statsResult = await client.callTool({
      name: 'git_repo_stats',
      arguments: {},
    });
    console.log(statsResult.content[0].text);
    console.log();

    // Test: Docker PS (may fail if Docker not running)
    console.log('=== Testing: Docker Containers ===');
    try {
      const dockerResult = await client.callTool({
        name: 'docker_ps',
        arguments: { all: true },
      });
      console.log(dockerResult.content[0].text);
    } catch (error) {
      console.log('Docker not available or not running');
    }
    console.log();

    // Test: Docker Images (may fail if Docker not running)
    console.log('=== Testing: Docker Images ===');
    try {
      const imagesResult = await client.callTool({
        name: 'docker_images',
        arguments: {},
      });
      console.log(imagesResult.content[0].text);
    } catch (error) {
      console.log('Docker not available or not running');
    }
    console.log();

    // Test: GitHub Workflows
    console.log('=== Testing: GitHub Workflows ===');
    const workflowsResult = await client.callTool({
      name: 'github_workflows',
      arguments: {},
    });
    console.log(workflowsResult.content[0].text);
    console.log();

    // Test: GitHub Workflow Runs (requires gh CLI)
    console.log('=== Testing: GitHub Workflow Runs ===');
    try {
      const runsResult = await client.callTool({
        name: 'github_workflow_runs',
        arguments: { limit: 5 },
      });
      console.log(runsResult.content[0].text);
    } catch (error) {
      console.log('GitHub CLI not available or not authenticated');
    }
    console.log();

    console.log('✓ All tests completed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

testDevOpsServer();
