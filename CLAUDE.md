# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AWS App Runner deployment project** that uses Terraform for infrastructure-as-code and GitHub Actions for CI/CD. The project is designed to:
1. Build a Go application in a Docker container
2. Push the container image to AWS ECR (Elastic Container Registry)
3. Deploy the containerized application to AWS App Runner using Terraform

**Current Status:** This is a skeleton/template repository. Most files are empty placeholders awaiting implementation.

## Repository Structure

```
App Runner/
├── app/                    # Go application source code
│   ├── main.go            # Application entry point (EMPTY - needs implementation)
│   ├── go.mod             # Go module definition (EMPTY)
│   └── go.sum             # Go dependencies (EMPTY)
├── .github/workflows/
│   └── deploy.yml         # GitHub Actions CI/CD pipeline (EMPTY - needs implementation)
├── Dockerfile             # Container image definition (EMPTY - needs implementation)
├── main.tf                # Terraform main configuration (EMPTY - needs implementation)
├── variables.tf           # Terraform input variables (IMPLEMENTED)
├── outputs.tf             # Terraform outputs (EMPTY - needs implementation)
└── trust-policy.json      # IAM trust policy for GitHub OIDC (EMPTY - needs implementation)
```

## Key Architecture Components

### Terraform Variables (variables.tf)
The following variables are defined and available for use:

- `aws_region` (default: "us-west-2") - AWS region for deployment
- `ecr_repository` (default: "apprunner-demo") - ECR repository name
- `apprunner_service_name` (default: "AppRunnerDemoService") - App Runner service name
- `image_identifier` (required) - Full ECR image URI with tag
- `commit_sha` (default: "unknown") - Git commit SHA for traceability

### Intended CI/CD Flow
The GitHub Actions workflow should:
1. Checkout code
2. Configure AWS credentials using OIDC (role: `arn:aws:iam::703671892588:role/GitHubAppRunnerDeployRole`)
3. Login to ECR
4. Build and push Docker image (tagged with commit SHA)
5. Run `terraform init` and `terraform apply` with the appropriate variables

### AWS Account Configuration
- **AWS Account ID:** 703671892588
- **IAM Role:** GitHubAppRunnerDeployRole (for GitHub Actions OIDC authentication)
- **Default Region:** us-west-2

## Development Commands

### Terraform Commands
```bash
# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan \
  -var="image_identifier=<ECR_URI>:<TAG>" \
  -var="commit_sha=<COMMIT_SHA>"

# Apply infrastructure changes
terraform apply \
  -var="image_identifier=<ECR_URI>:<TAG>" \
  -var="commit_sha=<COMMIT_SHA>"

# Destroy infrastructure
terraform destroy
```

### Go Application Commands (once implemented)
```bash
# Navigate to app directory
cd app

# Initialize Go module (if starting fresh)
go mod init <module-name>

# Install dependencies
go mod download
go mod tidy

# Run locally
go run main.go

# Build binary
go build -o app main.go

# Run tests
go test ./...
```

### Docker Commands
```bash
# Build Docker image locally
docker build -t apprunner-demo:local .

# Run container locally
docker run -p 8080:8080 apprunner-demo:local

# Test container
curl http://localhost:8080
```

## Implementation Notes

### Required Implementations

1. **app/main.go** - Should implement a basic HTTP server (typical port: 8080 or 80)
2. **app/go.mod** - Should declare the Go module and any dependencies (e.g., `github.com/gorilla/mux`, `net/http`)
3. **Dockerfile** - Should use multi-stage build to compile Go binary and package in minimal runtime image
4. **main.tf** - Should define:
   - `aws_apprunner_service` resource
   - IAM roles and policies for App Runner
   - ECR repository (or reference existing one)
   - Environment variables for the service
5. **outputs.tf** - Should output the App Runner service URL
6. **trust-policy.json** - Should define IAM trust policy allowing GitHub Actions OIDC provider to assume the deployment role
7. **.github/workflows/deploy.yml** - Should implement the full CI/CD pipeline as outlined above

### App Runner Considerations
- App Runner automatically handles load balancing, auto-scaling, and health checks
- The application should listen on a configurable port (via environment variable `PORT`)
- Health check endpoint should return 200 OK (typically `/` or `/health`)
- App Runner expects the container to start serving requests within the health check timeout

### Terraform State Management
Consider configuring a remote backend for Terraform state (e.g., S3 bucket with DynamoDB for state locking) rather than using local state, especially for team environments.
