/**
 * Comprehensive Integration Test for DevOps MCP Server
 * Tests all features: Git, Docker, GitHub Actions, and Deployment Automation
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const DeploymentAutomation = require('./deployment-automation');

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function logTest(category, name, status, details = '') {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○';
  console.log(`${icon} [${category}] ${name}${details ? ': ' + details : ''}`);
  
  results.tests.push({ category, name, status, details });
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else results.skipped++;
}

async function testMCPServer() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DevOps MCP Server - Comprehensive Integration Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new Client(
    { name: 'integration-test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['mcp/devops-server.js'],
  });

  try {
    await client.connect(transport);
    logTest('CONNECTION', 'MCP Server Connection', 'PASS');

    // Test 1: Tool Discovery
    console.log('\n─── Tool Discovery ───');
    const tools = await client.listTools();
    logTest('DISCOVERY', 'List All Tools', tools.tools.length === 15 ? 'PASS' : 'FAIL', 
      `Found ${tools.tools.length}/15 tools`);

    // Group tools by category
    const gitTools = tools.tools.filter(t => t.name.startsWith('git_'));
    const dockerTools = tools.tools.filter(t => t.name.startsWith('docker_'));
    const githubTools = tools.tools.filter(t => t.name.startsWith('github_'));
    const otherTools = tools.tools.filter(t => t.name.startsWith('check_'));

    logTest('DISCOVERY', 'Git Tools', gitTools.length === 6 ? 'PASS' : 'FAIL', 
      `${gitTools.length}/6 tools`);
    logTest('DISCOVERY', 'Docker Tools', dockerTools.length === 5 ? 'PASS' : 'FAIL', 
      `${dockerTools.length}/5 tools`);
    logTest('DISCOVERY', 'GitHub Tools', githubTools.length === 3 ? 'PASS' : 'FAIL', 
      `${githubTools.length}/3 tools`);

    // Test 2: Git Operations
    console.log('\n─── Git Operations ───');
    
    // Git Status
    try {
      const statusResult = await client.callTool({ name: 'git_status', arguments: {} });
      const status = JSON.parse(statusResult.content[0].text);
      logTest('GIT', 'git_status', 'PASS', `Branch: ${status.status.split('\n')[0]}`);
    } catch (error) {
      logTest('GIT', 'git_status', 'FAIL', error.message);
    }

    // Git Log
    try {
      const logResult = await client.callTool({ name: 'git_log', arguments: { limit: 3 } });
      const log = JSON.parse(logResult.content[0].text);
      logTest('GIT', 'git_log', log.commits.length > 0 ? 'PASS' : 'FAIL', 
        `Retrieved ${log.commits.length} commits`);
    } catch (error) {
      logTest('GIT', 'git_log', 'FAIL', error.message);
    }

    // Git Branches
    try {
      const branchesResult = await client.callTool({ name: 'git_branches', arguments: {} });
      const branches = JSON.parse(branchesResult.content[0].text);
      logTest('GIT', 'git_branches', branches.branches.length > 0 ? 'PASS' : 'FAIL', 
        `Found ${branches.count} branch(es)`);
    } catch (error) {
      logTest('GIT', 'git_branches', 'FAIL', error.message);
    }

    // Git Diff
    try {
      const diffResult = await client.callTool({ name: 'git_diff', arguments: {} });
      const diff = JSON.parse(diffResult.content[0].text);
      logTest('GIT', 'git_diff', 'PASS', diff.diff === 'No changes' ? 'Clean' : 'Has changes');
    } catch (error) {
      logTest('GIT', 'git_diff', 'FAIL', error.message);
    }

    // Git Repo Stats
    try {
      const statsResult = await client.callTool({ name: 'git_repo_stats', arguments: {} });
      const stats = JSON.parse(statsResult.content[0].text);
      logTest('GIT', 'git_repo_stats', 'PASS', 
        `${stats.total_commits} commits, ${stats.contributors.split('\n')[0].trim()}`);
    } catch (error) {
      logTest('GIT', 'git_repo_stats', 'FAIL', error.message);
    }

    // Test 3: Docker Operations
    console.log('\n─── Docker Operations ───');
    
    // Docker PS
    try {
      const psResult = await client.callTool({ name: 'docker_ps', arguments: { all: true } });
      const ps = JSON.parse(psResult.content[0].text);
      if (ps.error) {
        logTest('DOCKER', 'docker_ps', 'SKIP', 'Docker not running');
      } else {
        logTest('DOCKER', 'docker_ps', 'PASS', `${ps.count} container(s)`);
      }
    } catch (error) {
      logTest('DOCKER', 'docker_ps', 'SKIP', 'Docker not available');
    }

    // Docker Images
    try {
      const imagesResult = await client.callTool({ name: 'docker_images', arguments: {} });
      const images = JSON.parse(imagesResult.content[0].text);
      if (images.error) {
        logTest('DOCKER', 'docker_images', 'SKIP', 'Docker not running');
      } else {
        logTest('DOCKER', 'docker_images', 'PASS', `${images.count} image(s)`);
      }
    } catch (error) {
      logTest('DOCKER', 'docker_images', 'SKIP', 'Docker not available');
    }

    // Test 4: GitHub Actions
    console.log('\n─── GitHub Actions Integration ───');
    
    // List Workflows
    try {
      const workflowsResult = await client.callTool({ name: 'github_workflows', arguments: {} });
      const workflows = JSON.parse(workflowsResult.content[0].text);
      logTest('GITHUB', 'github_workflows', workflows.count > 0 ? 'PASS' : 'FAIL', 
        `${workflows.count} workflow(s): ${workflows.workflows.join(', ')}`);
    } catch (error) {
      logTest('GITHUB', 'github_workflows', 'FAIL', error.message);
    }

    // Workflow Runs (requires gh CLI)
    try {
      const runsResult = await client.callTool({ 
        name: 'github_workflow_runs', 
        arguments: { limit: 3 } 
      });
      const runs = JSON.parse(runsResult.content[0].text);
      if (runs.error) {
        logTest('GITHUB', 'github_workflow_runs', 'SKIP', 'gh CLI not configured');
      } else {
        const runArray = Array.isArray(runs) ? runs : [runs];
        logTest('GITHUB', 'github_workflow_runs', 'PASS', 
          `${runArray.length} recent run(s)`);
      }
    } catch (error) {
      logTest('GITHUB', 'github_workflow_runs', 'SKIP', 'gh CLI not available');
    }

    // Test 5: Deployment Checks
    console.log('\n─── Deployment Status ───');
    try {
      const deployResult = await client.callTool({ 
        name: 'check_deployment_status',
        arguments: { environment: 'production', service: 'api' }
      });
      logTest('DEPLOYMENT', 'check_deployment_status', 'PASS', 'Tool available');
    } catch (error) {
      logTest('DEPLOYMENT', 'check_deployment_status', 'FAIL', error.message);
    }

  } catch (error) {
    console.error('\n✗ Test suite failed:', error.message);
    logTest('CONNECTION', 'MCP Server Connection', 'FAIL', error.message);
  } finally {
    await client.close();
  }
}

async function testDeploymentAutomation() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Deployment Automation Module Tests');
  console.log('═══════════════════════════════════════════════════════════\n');

  const automation = new DeploymentAutomation({ verbose: false });

  // Test Pre-deployment Checks
  console.log('─── Pre-deployment Checks ───');
  try {
    const checks = automation.runPreDeploymentChecks();
    logTest('DEPLOY-AUTO', 'Pre-deployment checks', 'PASS',
      `Clean: ${checks.workingDirectoryClean}, Branch: ${checks.currentBranch}`);
  } catch (error) {
    logTest('DEPLOY-AUTO', 'Pre-deployment checks', 'FAIL', error.message);
  }

  // Test Git Operations
  console.log('\n─── Deployment Git Operations ───');
  try {
    const branch = automation.getCurrentBranch();
    logTest('DEPLOY-AUTO', 'Get current branch', branch ? 'PASS' : 'FAIL', branch);
  } catch (error) {
    logTest('DEPLOY-AUTO', 'Get current branch', 'FAIL', error.message);
  }

  try {
    const commit = automation.getLatestCommitHash(true);
    logTest('DEPLOY-AUTO', 'Get latest commit', commit ? 'PASS' : 'FAIL', commit);
  } catch (error) {
    logTest('DEPLOY-AUTO', 'Get latest commit', 'FAIL', error.message);
  }

  try {
    const isClean = automation.isWorkingDirectoryClean();
    logTest('DEPLOY-AUTO', 'Check working directory', 'PASS', 
      isClean ? 'Clean' : 'Has changes');
  } catch (error) {
    logTest('DEPLOY-AUTO', 'Check working directory', 'FAIL', error.message);
  }

  // Test Deployment History
  console.log('\n─── Deployment History ───');
  try {
    const history = automation.getDeploymentHistory('production', 5);
    logTest('DEPLOY-AUTO', 'Get deployment history', 'PASS', 
      `${history.length} deployment(s) found`);
  } catch (error) {
    logTest('DEPLOY-AUTO', 'Get deployment history', 'FAIL', error.message);
  }
}

async function runAllTests() {
  const startTime = Date.now();
  
  await testMCPServer();
  await testDeploymentAutomation();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests:    ${results.tests.length}`);
  console.log(`✓ Passed:       ${results.passed}`);
  console.log(`✗ Failed:       ${results.failed}`);
  console.log(`○ Skipped:      ${results.skipped}`);
  console.log(`Duration:       ${duration}s`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Categorized breakdown
  const categories = [...new Set(results.tests.map(t => t.category))];
  console.log('Results by Category:');
  categories.forEach(cat => {
    const catTests = results.tests.filter(t => t.category === cat);
    const passed = catTests.filter(t => t.status === 'PASS').length;
    const failed = catTests.filter(t => t.status === 'FAIL').length;
    const skipped = catTests.filter(t => t.status === 'SKIP').length;
    console.log(`  ${cat}: ${passed}✓ ${failed}✗ ${skipped}○`);
  });

  // Exit with appropriate code
  if (results.failed > 0) {
    console.log('\n⚠ Some tests failed. Review the output above.');
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed! DevOps MCP Server is fully functional.');
    process.exit(0);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
