# Model Context Protocol (MCP) Guide

## Overview
This guide explains the MCP implementation for the FileVault application, including message structure, client-server communication, and how to extend the system.

## What is MCP?
The Model Context Protocol (MCP) is a standardized protocol for communication between AI models and external systems. It provides a structured way to expose tools and resources that can be invoked by LLMs.

## Architecture

### Server (`mcp-server.js`)
The MCP server exposes FileVault functionality through a standardized interface:

- **Transport**: Uses stdio (standard input/output) for communication
- **Capabilities**: Declares support for tools and resources
- **Request Handlers**: Processes incoming requests from clients

### Client (`mcp-client-test.js`)
The test client demonstrates how to interact with the MCP server:

- Connects via stdio transport
- Lists available tools and resources
- Calls tools with parameters
- Reads resource data

## Message Structure

### Request Types
MCP uses JSON-RPC 2.0 for message structure. The SDK handles serialization/deserialization.

#### ListTools Request
Lists all available tools that can be called.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

#### CallTool Request
Invokes a specific tool with arguments.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_files",
    "arguments": {
      "path": "/documents"
    }
  },
  "id": 2
}
```

#### ListResources Request
Lists available resources that can be read.

```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "id": 3
}
```

#### ReadResource Request
Reads the content of a specific resource.

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "filevault://storage/info"
  },
  "id": 4
}
```

### Response Structure
All responses follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "result": { ... },
  "id": 1
}
```

## Client-Server Communication Flow

1. **Initialization**
   - Client creates transport (stdio, HTTP, etc.)
   - Client connects to server
   - Server initializes and declares capabilities

2. **Tool Discovery**
   - Client requests list of tools
   - Server returns tool definitions with schemas

3. **Tool Invocation**
   - Client calls tool with specific arguments
   - Server validates arguments against schema
   - Server executes tool logic
   - Server returns result

4. **Resource Access**
   - Client lists available resources
   - Client reads specific resource by URI
   - Server returns resource content

5. **Cleanup**
   - Client closes connection
   - Server terminates gracefully

## Available Tools

### list_files
Lists files in storage at a given path.

**Parameters:**
- `path` (optional): Directory path to list files from

**Example:**
```javascript
await client.callTool({
  name: 'list_files',
  arguments: { path: '/documents' }
});
```

### get_file_info
Gets metadata about a specific file.

**Parameters:**
- `filename` (required): Name of the file

**Example:**
```javascript
await client.callTool({
  name: 'get_file_info',
  arguments: { filename: 'example1.txt' }
});
```

## Available Resources

### filevault://storage/info
Provides information about the storage system including total files, size, and last sync time.

**Example:**
```javascript
await client.readResource({
  uri: 'filevault://storage/info'
});
```

## Running the MCP Server

### Start Server
```bash
npm run mcp:server
```

The server runs on stdio and waits for JSON-RPC messages.

### Test with Client
```bash
npm run mcp:test
```

Runs the test suite which verifies all functionality.

## Extending the MCP Server

### Adding a New Tool

1. Add tool definition in `ListToolsRequestSchema` handler:
```javascript
{
  name: 'my_new_tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description'
      }
    },
    required: ['param1']
  }
}
```

2. Add tool handler in `CallToolRequestSchema` handler:
```javascript
case 'my_new_tool': {
  const { param1 } = args;
  // Tool implementation
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(result, null, 2)
    }]
  };
}
```

### Adding a New Resource

1. Add resource definition in `ListResourcesRequestSchema` handler:
```javascript
{
  uri: 'filevault://my-resource',
  name: 'My Resource',
  description: 'Resource description',
  mimeType: 'application/json'
}
```

2. Add resource handler in `ReadResourceRequestSchema` handler:
```javascript
if (uri === 'filevault://my-resource') {
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2)
    }]
  };
}
```

## Integration with FileVault

The current implementation uses placeholder data. To integrate with actual FileVault functionality:

1. Import storage providers (AWS S3, Azure Blob)
2. Replace placeholder implementations with actual API calls
3. Add error handling for storage operations
4. Implement authentication/authorization

## Next Steps

- Integrate with actual AWS S3 and Azure storage backends
- Add authentication and authorization
- Implement file upload/download tools
- Add streaming support for large files
- Create resource templates for common queries
- Add logging and monitoring
- Implement rate limiting and quotas

## References

- [MCP Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
