/**
 * Deployment Automation Module
 * Provides reusable deployment workflows and triggers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentAutomation {
  constructor(options = {}) {
    this.repoPath = options.repoPath || process.cwd();
    this.verbose = options.verbose || false;
  }

  /**
   * Execute a command and return result
   */
  exec(command, options = {}) {
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        cwd: this.repoPath,
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

  /**
   * Log message if verbose mode is enabled
   */
  log(message) {
    if (this.verbose) {
      console.log(`[Deployment] ${message}`);
    }
  }

  /**
   * Check if the working directory is clean
   */
  isWorkingDirectoryClean() {
    const result = this.exec('git status --porcelain');
    return result.success && result.output === '';
  }

  /**
   * Get current branch name
   */
  getCurrentBranch() {
    const result = this.exec('git rev-parse --abbrev-ref HEAD');
    return result.success ? result.output : null;
  }

  /**
   * Get latest commit hash
   */
  getLatestCommitHash(short = true) {
    const flag = short ? '--short' : '';
    const result = this.exec(`git rev-parse ${flag} HEAD`);
    return result.success ? result.output : null;
  }

  /**
   * Create a deployment tag
   */
  createDeploymentTag(environment, version) {
    const tag = `deploy-${environment}-${version}`;
    const result = this.exec(`git tag -a ${tag} -m "Deployment to ${environment}: ${version}"`);
    
    if (!result.success) {
      throw new Error(`Failed to create tag: ${result.error}`);
    }

    this.log(`Created deployment tag: ${tag}`);
    return tag;
  }

  /**
   * Push tag to remote
   */
  pushTag(tag) {
    const result = this.exec(`git push origin ${tag}`);
    
    if (!result.success) {
      throw new Error(`Failed to push tag: ${result.error}`);
    }

    this.log(`Pushed tag to remote: ${tag}`);
    return true;
  }

  /**
   * Build Docker image
   */
  buildDockerImage(imageName, tag, dockerfilePath = '.') {
    const fullImageName = `${imageName}:${tag}`;
    this.log(`Building Docker image: ${fullImageName}`);
    
    const result = this.exec(`docker build -t ${fullImageName} ${dockerfilePath}`);
    
    if (!result.success) {
      throw new Error(`Docker build failed: ${result.error}`);
    }

    return fullImageName;
  }

  /**
   * Push Docker image to registry
   */
  pushDockerImage(imageName, tag) {
    const fullImageName = `${imageName}:${tag}`;
    this.log(`Pushing Docker image: ${fullImageName}`);
    
    const result = this.exec(`docker push ${fullImageName}`);
    
    if (!result.success) {
      throw new Error(`Docker push failed: ${result.error}`);
    }

    return true;
  }

  /**
   * Run pre-deployment checks
   */
  runPreDeploymentChecks() {
    this.log('Running pre-deployment checks...');
    
    const checks = {
      workingDirectoryClean: this.isWorkingDirectoryClean(),
      currentBranch: this.getCurrentBranch(),
      latestCommit: this.getLatestCommitHash(),
      gitRemoteConnected: false,
    };

    // Check git remote
    const remoteResult = this.exec('git remote -v');
    checks.gitRemoteConnected = remoteResult.success && remoteResult.output.length > 0;

    return checks;
  }

  /**
   * Trigger GitHub Actions workflow
   */
  triggerGitHubWorkflow(workflowFile, ref = 'main', inputs = {}) {
    this.log(`Triggering GitHub workflow: ${workflowFile}`);
    
    let inputsFlag = '';
    if (Object.keys(inputs).length > 0) {
      const inputPairs = Object.entries(inputs)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      inputsFlag = `-f ${inputPairs}`;
    }

    const result = this.exec(`gh workflow run ${workflowFile} --ref ${ref} ${inputsFlag}`);
    
    if (!result.success) {
      throw new Error(`Failed to trigger workflow: ${result.error}`);
    }

    return {
      workflow: workflowFile,
      ref,
      inputs,
      triggered: true,
    };
  }

  /**
   * Wait for GitHub workflow to complete
   */
  async waitForWorkflow(runId, timeoutMs = 600000) {
    this.log(`Waiting for workflow run ${runId} to complete...`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const result = this.exec(`gh run view ${runId} --json status,conclusion`);
      
      if (result.success) {
        const data = JSON.parse(result.output);
        
        if (data.status === 'completed') {
          this.log(`Workflow completed with conclusion: ${data.conclusion}`);
          return {
            completed: true,
            conclusion: data.conclusion,
            success: data.conclusion === 'success',
          };
        }
      }

      // Wait 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    throw new Error('Workflow timeout');
  }

  /**
   * Full deployment workflow
   */
  async deploy(options) {
    const {
      environment,
      version,
      imageName,
      dockerfilePath = '.',
      workflowFile,
      skipChecks = false,
      skipBuild = false,
      skipPush = false,
    } = options;

    this.log(`Starting deployment to ${environment} - version ${version}`);

    // Pre-deployment checks
    if (!skipChecks) {
      const checks = this.runPreDeploymentChecks();
      this.log(`Pre-deployment checks: ${JSON.stringify(checks, null, 2)}`);
      
      if (!checks.workingDirectoryClean) {
        throw new Error('Working directory is not clean. Commit or stash changes first.');
      }
    }

    const results = {
      environment,
      version,
      steps: [],
    };

    // Build Docker image
    if (!skipBuild && imageName) {
      try {
        const imageTag = `${version}-${this.getLatestCommitHash()}`;
        const fullImageName = this.buildDockerImage(imageName, imageTag, dockerfilePath);
        results.steps.push({ step: 'build', success: true, image: fullImageName });
      } catch (error) {
        results.steps.push({ step: 'build', success: false, error: error.message });
        throw error;
      }
    }

    // Push Docker image
    if (!skipPush && imageName) {
      try {
        const imageTag = `${version}-${this.getLatestCommitHash()}`;
        this.pushDockerImage(imageName, imageTag);
        results.steps.push({ step: 'push', success: true });
      } catch (error) {
        results.steps.push({ step: 'push', success: false, error: error.message });
        throw error;
      }
    }

    // Create deployment tag
    try {
      const tag = this.createDeploymentTag(environment, version);
      this.pushTag(tag);
      results.steps.push({ step: 'tag', success: true, tag });
    } catch (error) {
      results.steps.push({ step: 'tag', success: false, error: error.message });
      // Don't throw - tagging is not critical
    }

    // Trigger workflow
    if (workflowFile) {
      try {
        const workflowResult = this.triggerGitHubWorkflow(workflowFile, 'main', {
          environment,
          version,
        });
        results.steps.push({ step: 'trigger_workflow', success: true, ...workflowResult });
      } catch (error) {
        results.steps.push({ step: 'trigger_workflow', success: false, error: error.message });
        throw error;
      }
    }

    this.log(`Deployment completed: ${JSON.stringify(results, null, 2)}`);
    return results;
  }

  /**
   * Rollback deployment
   */
  rollback(environment, previousVersion) {
    this.log(`Rolling back ${environment} to version ${previousVersion}`);
    
    // Find the deployment tag
    const tag = `deploy-${environment}-${previousVersion}`;
    const result = this.exec(`git rev-parse ${tag}`);
    
    if (!result.success) {
      throw new Error(`Tag ${tag} not found`);
    }

    // Trigger rollback workflow or redeploy previous version
    return {
      environment,
      previousVersion,
      tag,
      message: 'Rollback initiated',
    };
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(environment, limit = 10) {
    const pattern = `deploy-${environment}-*`;
    const result = this.exec(`git tag -l "${pattern}" --sort=-creatordate | head -n ${limit}`);
    
    if (!result.success) {
      return [];
    }

    return result.output.split('\n').filter(tag => tag);
  }
}

module.exports = DeploymentAutomation;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const automation = new DeploymentAutomation({ verbose: true });

  switch (command) {
    case 'deploy':
      automation.deploy({
        environment: args[1] || 'dev',
        version: args[2] || 'latest',
        imageName: args[3],
        workflowFile: args[4],
      }).then(result => {
        console.log('Deployment successful:', result);
      }).catch(error => {
        console.error('Deployment failed:', error.message);
        process.exit(1);
      });
      break;

    case 'rollback':
      try {
        const result = automation.rollback(args[1] || 'dev', args[2]);
        console.log('Rollback initiated:', result);
      } catch (error) {
        console.error('Rollback failed:', error.message);
        process.exit(1);
      }
      break;

    case 'history':
      try {
        const history = automation.getDeploymentHistory(args[1] || 'dev', args[2] || 10);
        console.log('Deployment history:', history);
      } catch (error) {
        console.error('Failed to get history:', error.message);
        process.exit(1);
      }
      break;

    case 'checks':
      try {
        const checks = automation.runPreDeploymentChecks();
        console.log('Pre-deployment checks:', checks);
      } catch (error) {
        console.error('Checks failed:', error.message);
        process.exit(1);
      }
      break;

    default:
      console.log('Usage:');
      console.log('  node deployment-automation.js deploy <environment> <version> [image-name] [workflow-file]');
      console.log('  node deployment-automation.js rollback <environment> <version>');
      console.log('  node deployment-automation.js history <environment> [limit]');
      console.log('  node deployment-automation.js checks');
      process.exit(1);
  }
}
