# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AWS App Runner deployment project** using Terraform for infrastructure-as-code and GitHub Actions for CI/CD. The project:
1. Builds a Go application in a Docker container
2. Pushes the container image to AWS ECR
3. Deploys to AWS App Runner using Terraform

## Repository Structure

```
App Runner/
├── app/
│   ├── main.go              # Go HTTP server application
│   ├── go.mod               # Go module definition
│   └── go.sum               # Go dependencies
├── .github/workflows/
│   └── deploy.yml           # GitHub Actions CI/CD pipeline
├── Dockerfile               # Multi-stage Docker build
├── main.tf                  # Terraform configuration (IAM + App Runner)
├── variables.tf             # Terraform input variables
└── outputs.tf               # Terraform outputs (service URL, etc.)
```

## Key Configuration

### Terraform Variables (variables.tf)
- `aws_region` (default: "us-west-2")
- `ecr_repository` (default: "apprunner-demo")
- `apprunner_service_name` (default: "AppRunnerDemoService")
- `image_identifier` (required) - Full ECR image URI with tag
- `commit_sha` (default: "unknown") - Git commit SHA

### AWS Resources
- **ECR Repository**: `apprunner-demo` (pre-existing, referenced as data source)
- **IAM Role**: `AppRunnerECRAccessRole` (for App Runner to pull from ECR)
- **App Runner Service**: `AppRunnerDemoService`

### AWS Account
- **Account ID**: 703671892588
- **Region**: us-west-2
- **GitHub Actions Role**: GitHubAppRunnerDeployRole (OIDC authentication)

## Development Commands

### Terraform
```bash
# Initialize Terraform
terraform init

# Plan changes
terraform plan -var="image_identifier=<ECR_URI>:<TAG>"

# Apply changes
terraform apply -var="image_identifier=<ECR_URI>:<TAG>"

# Destroy infrastructure
terraform destroy
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
5. Runs Terraform to deploy/update App Runner service

## Important Notes

### Terraform State
- **Remote backend**: S3 bucket `apprunner-demo-terraform-state-703671892588`
- **State locking**: DynamoDB table `apprunner-demo-terraform-locks`
- This ensures state persists between GitHub Actions runs

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
