# AWS App Runner Deployment with CDK

A complete CI/CD pipeline for deploying a Go application to AWS App Runner using AWS CDK and GitHub Actions.

## Overview

This project demonstrates how to:
- Build a containerized Go application
- Push Docker images to Amazon ECR
- Deploy to AWS App Runner using AWS CDK (TypeScript)
- Automate deployments with GitHub Actions

## Architecture

```
GitHub → GitHub Actions → ECR → App Runner
                ↓
              AWS CDK
```

## Prerequisites

- AWS Account (Account ID: 703671892588)
- Node.js 20+ and npm
- AWS CLI configured
- Docker installed
- Go 1.21+ (for local development)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Bootstrap CDK (First time only)

```bash
npx cdk bootstrap aws://703671892588/us-west-2
```

### 3. Deploy

```bash
# Get the current commit SHA
COMMIT_SHA=$(git rev-parse HEAD)

# Build and deploy locally (use commit SHA as image tag, not 'latest')
IMAGE_IDENTIFIER=703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:$COMMIT_SHA \
COMMIT_SHA=$COMMIT_SHA \
npm run deploy
```

**Important:** The image tag must match an existing image in ECR. The CI/CD pipeline tags images with commit SHAs, not `latest`.

## Project Structure

```
.
├── app/                        # Go application
│   ├── main.go
│   ├── go.mod
│   └── go.sum
├── bin/                        # CDK entry point
│   └── app.ts
├── lib/                        # CDK stacks
│   └── apprunner-stack.ts
├── .github/workflows/          # CI/CD
│   └── deploy.yml
├── Dockerfile                  # Container definition
├── cdk.json                    # CDK configuration
├── package.json                # Node dependencies
└── tsconfig.json               # TypeScript config
```

## Development

### Run Locally

```bash
# Go application
cd app
go run main.go

# Test
curl http://localhost:8080
curl http://localhost:8080/health
```

### Docker

```bash
# Build
docker build -t apprunner-demo:local .

# Run
docker run -p 8080:8080 apprunner-demo:local
```

### CDK Commands

```bash
# Synthesize CloudFormation template
npm run synth

# View differences
npm run diff

# Deploy
npm run deploy

# Destroy
npm run destroy
```

## CI/CD Pipeline

On push to `main` branch, GitHub Actions:

1. Checks out code
2. Authenticates to AWS (OIDC)
3. Builds and pushes Docker image to ECR
4. Deploys infrastructure with CDK

### Required IAM Setup

- AWS authentication via OIDC (no secrets needed)
- Role: `arn:aws:iam::703671892588:role/GitHubAppRunnerDeployRole`
- Required policy: `CDKGitHubActionsPolicy` (see [IAM-SETUP.md](IAM-SETUP.md))

The IAM role must have permissions for:
- CDK operations (SSM, CloudFormation, S3)
- ECR (push/pull images)
- App Runner (create/update services)

## Configuration

### Environment Variables

- `IMAGE_IDENTIFIER`: Full ECR image URI (required)
- `COMMIT_SHA`: Git commit SHA (default: "unknown")
- `AWS_REGION`: AWS region (default: "us-west-2")

### CDK Context

Edit [bin/app.ts](bin/app.ts) to modify:
- Account ID
- Region
- Service name
- ECR repository name
- IAM role name

### App Runner Settings

Configured in [lib/apprunner-stack.ts](lib/apprunner-stack.ts):
- CPU: 1024 (1 vCPU)
- Memory: 2048 MB
- Port: 8080
- Health check: `/health`
- Auto-deployment: Disabled

## AWS Resources

### Created by CDK
- App Runner Service: `AppRunnerDemoService`

### Pre-existing (Referenced)
- ECR Repository: `apprunner-demo`
- IAM Role: `AppRunnerECRAccessRole`
- GitHub OIDC Role: `GitHubAppRunnerDeployRole`

## Migration from Terraform

This project was migrated from Terraform to CDK. See [MIGRATION.md](MIGRATION.md) for details.

## Outputs

After deployment, CDK provides:
- `ServiceURL`: Public URL of the App Runner service
- `ServiceARN`: ARN of the service
- `ServiceId`: Unique service identifier
- `ECRRepositoryURL`: ECR repository URI

## Troubleshooting

### Bootstrap Required
```bash
npx cdk bootstrap aws://703671892588/us-west-2
```

### Deployment Fails
- Check CloudFormation console for detailed errors
- Verify IAM role has necessary permissions
- Ensure ECR image exists and is accessible

### Service Not Starting
- Check App Runner logs in AWS Console
- Verify container listens on port 8080
- Ensure `/health` endpoint returns 200

### Image Not Found
- Error: "Your service failed to create"
- The image tag must exist in ECR
- Check available tags: `aws ecr describe-images --repository-name apprunner-demo --region us-west-2`
- Images are tagged with commit SHAs, not `latest`

## Documentation

- [README.md](README.md) - This file (project overview)
- [CLAUDE.md](CLAUDE.md) - AI assistant guidance
- [MIGRATION.md](MIGRATION.md) - Terraform to CDK migration guide
- [IAM-SETUP.md](IAM-SETUP.md) - IAM configuration for GitHub Actions

## License

MIT
