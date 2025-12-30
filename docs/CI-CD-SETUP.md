# CI/CD Pipeline Setup

This document describes the CI/CD pipeline configuration for the FileVault project.

## Overview

The CI/CD pipeline is configured using **GitHub Actions** and includes three main stages:

1. **Linting** - Code quality checks using ESLint
2. **Testing** - Unit tests using Jest with coverage reports
3. **SonarQube Analysis** - Static code analysis and quality gate checks

## Pipeline Structure

### Workflow File
Location: `.github/workflows/cicd.yml`

### Pipeline Stages

#### 1. Linting Stage
- **Tool**: ESLint
- **Purpose**: Ensures code follows consistent style and catches common errors
- **Runs on**: Every push and pull request to `main` and `develop` branches
- **Commands**:
  ```bash
  npm run lint        # Run linting
  npm run lint:fix    # Auto-fix linting issues
  ```

#### 2. Testing Stage
- **Tool**: Jest
- **Purpose**: Runs unit tests and generates coverage reports
- **Dependencies**: Runs after linting passes
- **Commands**:
  ```bash
  npm test              # Run all tests with coverage
  npm run test:watch    # Run tests in watch mode
  npm run test:aws      # Run AWS S3 tests only
  npm run test:azure    # Run Azure SA tests only
  ```
- **Coverage Reports**: Uploaded as artifacts and available for 30 days

#### 3. SonarQube Analysis Stage
- **Tool**: SonarQube/SonarCloud
- **Purpose**: Static code analysis, code smells, bugs, and security vulnerabilities
- **Dependencies**: Runs after tests pass
- **Features**:
  - Code quality metrics
  - Security vulnerability detection
  - Code coverage integration
  - Quality gate enforcement

## Setup Instructions

### Prerequisites
1. Node.js (v18 or higher)
2. npm package manager
3. Git repository hosted on GitHub
4. SonarQube instance or SonarCloud account

### Local Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Linting**
   ```bash
   npm run lint
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

### GitHub Actions Setup

The pipeline will automatically run on push and pull request events. No additional configuration needed for linting and testing stages.

### SonarQube Configuration

#### Option 1: SonarCloud (Recommended for public repos)

1. **Sign up at SonarCloud**: https://sonarcloud.io
2. **Create a new project** and link your GitHub repository
3. **Add GitHub Secrets**:
   - Go to: Repository Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `SONAR_TOKEN`: Your SonarCloud authentication token
     - `SONAR_HOST_URL`: `https://sonarcloud.io`

4. **Update sonar-project.properties**:
   ```properties
   sonar.organization=your-organization
   sonar.projectKey=your-project-key
   ```

#### Option 2: Self-Hosted SonarQube

1. **Set up SonarQube server**: Follow official documentation
2. **Create a project** in SonarQube
3. **Generate authentication token**
4. **Add GitHub Secrets**:
   - `SONAR_TOKEN`: Your SonarQube authentication token
   - `SONAR_HOST_URL`: Your SonarQube server URL (e.g., `https://sonar.example.com`)

### Configuration Files

#### package.json
Contains scripts for linting and testing:
```json
{
  "scripts": {
    "lint": "eslint \"src/**/*.js\"",
    "lint:fix": "eslint \"src/**/*.js\" --fix",
    "test": "jest --coverage"
  }
}
```

#### .eslintrc.json
ESLint configuration with Node.js best practices

#### sonar-project.properties
SonarQube project configuration:
- Project metadata
- Source and test directories
- Coverage report paths
- Exclusion patterns

## Running the Pipeline

### Automatic Triggers
The pipeline automatically runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### Manual Trigger
1. Go to the **Actions** tab in your GitHub repository
2. Select the **CI Pipeline** workflow
3. Click **Run workflow**

## Pipeline Results

### Success Criteria
All stages must pass for the pipeline to succeed:
- ✓ No linting errors
- ✓ All tests pass
- ✓ SonarQube quality gate passes

### Artifacts
- Test coverage reports (available for 30 days)
- SonarQube analysis results

## Troubleshooting

### Linting Failures
```bash
# View linting errors
npm run lint

# Auto-fix common issues
npm run lint:fix
```

### Test Failures
```bash
# Run tests locally
npm test

# Run specific test suite
npm run test:aws
npm run test:azure

# Run in watch mode for development
npm run test:watch
```

### SonarQube Failures
- Check that `SONAR_TOKEN` and `SONAR_HOST_URL` secrets are correctly configured
- Verify network connectivity to SonarQube server
- Review quality gate rules in SonarQube settings

## Best Practices

1. **Commit often**: Run linting and tests locally before pushing
2. **Write tests**: Maintain high code coverage (aim for >80%)
3. **Review SonarQube reports**: Address code smells and vulnerabilities
4. **Keep dependencies updated**: Regularly update npm packages
5. **Monitor pipeline**: Check GitHub Actions for any failures

## Additional Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [SonarQube Documentation](https://docs.sonarqube.org/latest/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
