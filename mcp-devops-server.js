const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create DevOps MCP server
const server = new Server(
  {
    name: 'devops-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to execute shell commands safely
function executeCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      ...options
    });
    return { success: true, output: result.trim() };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout ? error.stdout.trim() : '',
      stderr: error.stderr ? error.stderr.trim() : ''
    };
  }
}

// Define available DevOps tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Git Operations
      {
        name: 'git_status',
        description: 'Get the current status of the Git repository',
        inputSchema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the Git repository (defaults to current directory)',
            },
          },
        },
      },
      {
        name: 'git_log',
        description: 'Get commit history with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the Git repository',
            },
            limit: {
              type: 'number',
              description: 'Number of commits to retrieve',
              default: 10,
            },
            author: {
              type: 'string',
              description: 'Filter by author name',
            },
          },
        },
      },
      {
        name: 'git_branches',
        description: 'List all branches in the repository',
        inputSchema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the Git repository',
            },
            include_remote: {
              type: 'boolean',
              description: 'Include remote branches',
              default: false,
            },
          },
        },
      },
      {
        name: 'git_diff',
        description: 'Show changes between commits, branches, or working directory',
        inputSchema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the Git repository',
            },
            target: {
              type: 'string',
              description: 'Target to compare (commit hash, branch name, or empty for working directory)',
            },
          },
        },
      },
      {
        name: 'git_repo_stats',
        description: 'Get repository statistics (file count, contributors, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the Git repository',
            },
          },
        },
      },
      {
        name: 'git_create_branch',
        description: 'Create a new Git branch',
        inputSchema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the Git repository',
            },
            branch_name: {
              type: 'string',
              description: 'Name of the new branch',
            },
            checkout: {
              type: 'boolean',
              description: 'Checkout the new branch after creation',
              default: false,
            },
          },
          required: ['branch_name'],
        },
      },
      // Docker Operations
      {
        name: 'docker_ps',
        description: 'List running Docker containers',
        inputSchema: {
          type: 'object',
          properties: {
            all: {
              type: 'boolean',
              description: 'Show all containers (including stopped)',
              default: false,
            },
          },
        },
      },
      {
        name: 'docker_images',
        description: 'List Docker images',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter images by name',
            },
          },
        },
      },
      {
        name: 'docker_inspect',
        description: 'Inspect a Docker container or image',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Container ID/name or image ID/name',
            },
          },
          required: ['target'],
        },
      },
      {
        name: 'docker_stats',
        description: 'Get resource usage statistics for containers',
        inputSchema: {
          type: 'object',
          properties: {
            container: {
              type: 'string',
              description: 'Specific container to get stats for (optional)',
            },
          },
        },
      },
      {
        name: 'docker_logs',
        description: 'Get logs from a Docker container',
        inputSchema: {
          type: 'object',
          properties: {
            container: {
              type: 'string',
              description: 'Container ID or name',
            },
            tail: {
              type: 'number',
              description: 'Number of lines to show from the end',
              default: 100,
            },
          },
          required: ['container'],
        },
      },
      // GitHub Actions
      {
        name: 'github_workflows',
        description: 'List GitHub Actions workflows',
        inputSchema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the repository',
            },
          },
        },
      },
      {
        name: 'github_workflow_runs',
        description: 'Get recent workflow runs using gh CLI',
        inputSchema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the repository',
            },
            limit: {
              type: 'number',
              description: 'Number of runs to retrieve',
              default: 10,
            },
          },
        },
      },
      {
        name: 'github_trigger_workflow',
        description: 'Trigger a GitHub Actions workflow using gh CLI',
        inputSchema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the repository',
            },
            workflow: {
              type: 'string',
              description: 'Workflow file name or ID',
            },
            ref: {
              type: 'string',
              description: 'Git ref to run workflow on',
              default: 'main',
            },
          },
          required: ['workflow'],
        },
      },
      // CI/CD Monitoring
      {
        name: 'check_deployment_status',
        description: 'Check status of deployment in various environments',
        inputSchema: {
          type: 'object',
          properties: {
            environment: {
              type: 'string',
              description: 'Environment to check (dev, staging, production)',
            },
            service: {
              type: 'string',
              description: 'Service name to check',
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const repoPath = args.repo_path || process.cwd();

  try {
    switch (name) {
      // Git Operations
      case 'git_status': {
        const result = executeCommand(`git -C "${repoPath}" status --porcelain -b`);
        if (!result.success) {
          throw new Error(`Git status failed: ${result.error}`);
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ status: result.output, repo_path: repoPath }, null, 2),
          }],
        };
      }

      case 'git_log': {
        const limit = args.limit || 10;
        const authorFilter = args.author ? `--author="${args.author}"` : '';
        const cmd = `git -C "${repoPath}" log ${authorFilter} -n ${limit} --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso`;
        const result = executeCommand(cmd);
        
        if (!result.success) {
          throw new Error(`Git log failed: ${result.error}`);
        }

        const commits = result.output.split('\n').filter(line => line).map(line => {
          const [hash, author, email, date, message] = line.split('|');
          return { hash, author, email, date, message };
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ commits, total: commits.length }, null, 2),
          }],
        };
      }

      case 'git_branches': {
        const flag = args.include_remote ? '-a' : '';
        const result = executeCommand(`git -C "${repoPath}" branch ${flag}`);
        
        if (!result.success) {
          throw new Error(`Git branch failed: ${result.error}`);
        }

        const branches = result.output.split('\n')
          .map(b => b.trim().replace('* ', ''))
          .filter(b => b);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ branches, count: branches.length }, null, 2),
          }],
        };
      }

      case 'git_diff': {
        const target = args.target || '';
        const result = executeCommand(`git -C "${repoPath}" diff ${target} --stat`);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ 
              diff: result.output || 'No changes',
              target: target || 'working directory'
            }, null, 2),
          }],
        };
      }

      case 'git_repo_stats': {
        const fileCount = executeCommand(`git -C "${repoPath}" ls-files | wc -l`);
        const contributors = executeCommand(`git -C "${repoPath}" shortlog -sn --all`);
        const totalCommits = executeCommand(`git -C "${repoPath}" rev-list --count HEAD`);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total_files: fileCount.output.trim(),
              total_commits: totalCommits.output.trim(),
              contributors: contributors.output,
              repo_path: repoPath,
            }, null, 2),
          }],
        };
      }

      case 'git_create_branch': {
        const { branch_name, checkout } = args;
        const checkoutFlag = checkout ? '-b' : '';
        const createCmd = checkout 
          ? `git -C "${repoPath}" checkout -b ${branch_name}`
          : `git -C "${repoPath}" branch ${branch_name}`;
        
        const result = executeCommand(createCmd);
        
        if (!result.success) {
          throw new Error(`Failed to create branch: ${result.error}`);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              branch: branch_name,
              checked_out: checkout,
              message: result.output,
            }, null, 2),
          }],
        };
      }

      // Docker Operations
      case 'docker_ps': {
        const flag = args.all ? '-a' : '';
        const result = executeCommand(`docker ps ${flag} --format "{{.ID}}|{{.Names}}|{{.Status}}|{{.Image}}"`);
        
        if (!result.success) {
          throw new Error(`Docker ps failed: ${result.error}`);
        }

        const containers = result.output.split('\n').filter(line => line).map(line => {
          const [id, name, status, image] = line.split('|');
          return { id, name, status, image };
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ containers, count: containers.length }, null, 2),
          }],
        };
      }

      case 'docker_images': {
        const filter = args.filter ? `--filter "reference=${args.filter}"` : '';
        const result = executeCommand(`docker images ${filter} --format "{{.ID}}|{{.Repository}}|{{.Tag}}|{{.Size}}"`);
        
        if (!result.success) {
          throw new Error(`Docker images failed: ${result.error}`);
        }

        const images = result.output.split('\n').filter(line => line).map(line => {
          const [id, repository, tag, size] = line.split('|');
          return { id, repository, tag, size };
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ images, count: images.length }, null, 2),
          }],
        };
      }

      case 'docker_inspect': {
        const result = executeCommand(`docker inspect ${args.target}`);
        
        if (!result.success) {
          throw new Error(`Docker inspect failed: ${result.error}`);
        }

        return {
          content: [{
            type: 'text',
            text: result.output,
          }],
        };
      }

      case 'docker_stats': {
        const container = args.container || '';
        const result = executeCommand(`docker stats ${container} --no-stream --format "{{.Container}}|{{.CPUPerc}}|{{.MemUsage}}|{{.NetIO}}"`);
        
        if (!result.success) {
          throw new Error(`Docker stats failed: ${result.error}`);
        }

        const stats = result.output.split('\n').filter(line => line).map(line => {
          const [container, cpu, memory, network] = line.split('|');
          return { container, cpu, memory, network };
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ stats }, null, 2),
          }],
        };
      }

      case 'docker_logs': {
        const tail = args.tail || 100;
        const result = executeCommand(`docker logs ${args.container} --tail ${tail}`);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              container: args.container,
              logs: result.output || result.stderr || 'No logs available',
            }, null, 2),
          }],
        };
      }

      // GitHub Actions
      case 'github_workflows': {
        const workflowsPath = path.join(repoPath, '.github', 'workflows');
        
        if (!fs.existsSync(workflowsPath)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ workflows: [], message: 'No .github/workflows directory found' }, null, 2),
            }],
          };
        }

        const files = fs.readdirSync(workflowsPath)
          .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ workflows: files, count: files.length }, null, 2),
          }],
        };
      }

      case 'github_workflow_runs': {
        const limit = args.limit || 10;
        const result = executeCommand(`gh run list --limit ${limit} --json status,conclusion,name,headBranch,createdAt`, {
          cwd: repoPath,
        });
        
        if (!result.success) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'gh CLI not available or not authenticated',
                hint: 'Install GitHub CLI and run: gh auth login',
              }, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: result.output,
          }],
        };
      }

      case 'github_trigger_workflow': {
        const { workflow, ref } = args;
        const refFlag = ref || 'main';
        const result = executeCommand(`gh workflow run ${workflow} --ref ${refFlag}`, {
          cwd: repoPath,
        });
        
        if (!result.success) {
          throw new Error(`Failed to trigger workflow: ${result.error}`);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              workflow,
              ref: refFlag,
              message: 'Workflow triggered successfully',
            }, null, 2),
          }],
        };
      }

      case 'check_deployment_status': {
        const { environment, service } = args;
        
        // This is a placeholder - integrate with your actual deployment system
        // Could integrate with Kubernetes, AWS ECS, Azure Container Apps, etc.
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              environment: environment || 'unknown',
              service: service || 'unknown',
              status: 'This requires integration with your deployment platform (K8s, ECS, etc.)',
              hint: 'Extend this tool with kubectl, aws ecs, or az container commands',
            }, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          tool: name,
          arguments: args,
        }, null, 2),
      }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DevOps MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
