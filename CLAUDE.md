# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AWS App Runner deployment project** using AWS CDK for infrastructure-as-code and GitHub Actions for CI/CD. The project:
1. Builds a Go application in a Docker container
2. Pushes the container image to AWS ECR
3. Deploys to AWS App Runner using AWS CDK (TypeScript)

## Repository Structure

```
App Runner/
├── app/
│   ├── main.go              # Go HTTP server application
│   ├── go.mod               # Go module definition
│   └── go.sum               # Go dependencies
├── bin/
│   └── app.ts               # CDK app entry point
├── lib/
│   └── apprunner-stack.ts   # CDK stack definition
├── .github/workflows/
│   └── deploy.yml           # GitHub Actions CI/CD pipeline
├── Dockerfile               # Multi-stage Docker build
├── cdk.json                 # CDK configuration
├── package.json             # Node.js dependencies
└── tsconfig.json            # TypeScript configuration
```

## Key Configuration

### CDK Stack Properties (bin/app.ts)
- `aws_region` (default: "us-west-2")
- `ecrRepositoryName`: "apprunner-demo"
- `appRunnerServiceName`: "AppRunnerDemoService"
- `imageIdentifier` (required) - Full ECR image URI with tag (via IMAGE_IDENTIFIER env var)
- `commitSha` (default: "unknown") - Git commit SHA (via COMMIT_SHA env var)
- `iamRoleName`: "AppRunnerECRAccessRole"

### AWS Resources
- **ECR Repository**: `apprunner-demo` (pre-existing, referenced as data source)
- **IAM Role**: `AppRunnerECRAccessRole` (for App Runner to pull from ECR)
- **App Runner Service**: `AppRunnerDemoService`

### AWS Account
- **Account ID**: 703671892588
- **Region**: us-west-2
- **GitHub Actions Role**: GitHubAppRunnerDeployRole (OIDC authentication)

## Development Commands

### CDK
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Synthesize CloudFormation template
npm run synth

# Deploy to AWS
IMAGE_IDENTIFIER=<ECR_URI>:<TAG> COMMIT_SHA=<SHA> npm run deploy

# View differences
npm run diff

# Destroy infrastructure
npm run destroy

# Direct CDK commands
npx cdk deploy
npx cdk diff
npx cdk synth
```

### Go Application
```bash
cd app

# Run locally
go run main.go

# Build
go build -o app main.go

# Test
go test ./...
```

### Docker
```bash
# Build locally
docker build -t apprunner-demo:local .

# Run locally
docker run -p 8080:8080 apprunner-demo:local

# Test
curl http://localhost:8080
curl http://localhost:8080/health
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. Checks out code
2. Authenticates to AWS using OIDC
3. Logs into ECR
4. Builds and pushes Docker image (tagged with commit SHA)
5. Installs Node.js dependencies
6. Runs CDK deploy to update App Runner service

## Important Notes

### CDK Bootstrap
CDK requires a one-time bootstrap in your AWS account:
```bash
npx cdk bootstrap aws://703671892588/us-west-2
```

This creates an S3 bucket and other resources needed for CDK deployments.

### App Runner Configuration
- Application listens on port 8080
- Health check endpoint: `/health`
- Environment variable `COMMIT_SHA` injected for traceability
- CPU: 1024 (1 vCPU)
- Memory: 2048 MB (2 GB)

### IAM Trust Relationship
The `AppRunnerECRAccessRole` must trust `build.apprunner.amazonaws.com`:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "build.apprunner.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}
```

### Troubleshooting
- If deployment fails with IAM errors, the role may still be propagating (AWS eventual consistency)
- The role needs the AWS managed policy: `AWSAppRunnerServicePolicyForECRAccess`
- Ensure GitHub Actions has proper permissions via the OIDC role
- For CDK-specific errors, check `cdk.out/` directory for synthesized templates
