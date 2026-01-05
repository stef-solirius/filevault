const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

// Create an MCP server
const server = new Server(
  {
    name: 'filevault-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_files',
        description: 'List files in the storage',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to list files from',
            },
          },
        },
      },
      {
        name: 'get_file_info',
        description: 'Get information about a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'Name of the file to get info for',
            },
          },
          required: ['filename'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'list_files': {
      // Placeholder implementation
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              files: ['example1.txt', 'example2.pdf', 'example3.jpg'],
              path: args.path || '/',
            }, null, 2),
          },
        ],
      };
    }

    case 'get_file_info': {
      // Placeholder implementation
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              filename: args.filename,
              size: 1024,
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Define available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'filevault://storage/info',
        name: 'Storage Information',
        description: 'Information about the storage system',
        mimeType: 'application/json',
      },
    ],
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'filevault://storage/info') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            provider: 'filevault',
            totalFiles: 42,
            totalSize: 1048576,
            lastSync: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FileVault MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
