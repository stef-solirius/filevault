const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function testMCPServer() {
  console.log('Starting MCP client test...\n');

  const client = new Client(
    {
      name: 'filevault-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  // Create transport that will spawn the server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['mcp/server.js'],
  });

  try {
    // Connect to the server
    await client.connect(transport);
    console.log('✓ Connected to MCP server\n');

    // Test: List available tools
    console.log('Testing: List Tools');
    const tools = await client.listTools();
    console.log('Available tools:', JSON.stringify(tools.tools, null, 2));
    console.log('✓ List tools successful\n');

    // Test: List available resources
    console.log('Testing: List Resources');
    const resources = await client.listResources();
    console.log('Available resources:', JSON.stringify(resources.resources, null, 2));
    console.log('✓ List resources successful\n');

    // Test: Call a tool
    console.log('Testing: Call Tool (list_files)');
    const listResult = await client.callTool({
      name: 'list_files',
      arguments: { path: '/documents' },
    });
    console.log('Result:', JSON.stringify(listResult, null, 2));
    console.log('✓ Call tool successful\n');

    // Test: Call another tool
    console.log('Testing: Call Tool (get_file_info)');
    const infoResult = await client.callTool({
      name: 'get_file_info',
      arguments: { filename: 'example1.txt' },
    });
    console.log('Result:', JSON.stringify(infoResult, null, 2));
    console.log('✓ Call tool successful\n');

    // Test: Read a resource
    console.log('Testing: Read Resource');
    const resource = await client.readResource({
      uri: 'filevault://storage/info',
    });
    console.log('Resource content:', JSON.stringify(resource, null, 2));
    console.log('✓ Read resource successful\n');

    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    await client.close();
  }
}

testMCPServer();
