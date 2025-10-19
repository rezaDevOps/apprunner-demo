# Terraform to AWS CDK Migration Guide

This document guides you through migrating from Terraform to AWS CDK for the App Runner deployment.

## Migration Overview

The project has been successfully migrated from Terraform to AWS CDK (TypeScript). The infrastructure definition is now code-first with strong typing and better IDE support.

## What Changed

### Files Added
- `bin/app.ts` - CDK application entry point
- `lib/apprunner-stack.ts` - CDK stack definition (replaces main.tf)
- `cdk.json` - CDK configuration
- `package.json` - Node.js dependencies
- `tsconfig.json` - TypeScript configuration
- `MIGRATION.md` - This file

### Files Modified
- `.github/workflows/deploy.yml` - Updated to use CDK instead of Terraform
- `CLAUDE.md` - Updated documentation
- `.gitignore` - Added CDK-specific entries

### Files to Remove (After Migration)
- `main.tf` - Terraform main configuration
- `variables.tf` - Terraform variables
- `outputs.tf` - Terraform outputs
- `.terraform/` - Terraform working directory
- `.terraform.lock.hcl` - Terraform lock file

## Migration Steps

### 1. Update IAM Permissions (Required)

The GitHub Actions role needs additional permissions for CDK. Apply the CDK policy:

```bash
# Create the CDK policy
aws iam create-policy \
  --policy-name CDKGitHubActionsPolicy \
  --policy-document file://cdk-github-actions-policy.json

# Attach to the GitHub Actions role
aws iam attach-role-policy \
  --role-name GitHubAppRunnerDeployRole \
  --policy-arn arn:aws:iam::703671892588:policy/CDKGitHubActionsPolicy
```

See [IAM-SETUP.md](IAM-SETUP.md) for detailed IAM configuration.

### 2. Bootstrap CDK (One-time setup)

Before deploying with CDK, you need to bootstrap your AWS account:

```bash
npx cdk bootstrap aws://703671892588/us-west-2
```

This creates the necessary S3 bucket and IAM roles for CDK deployments.

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify CDK Configuration

Review the stack configuration in [bin/app.ts](bin/app.ts):
- AWS account: `703671892588`
- Region: `us-west-2`
- ECR repository: `apprunner-demo`
- Service name: `AppRunnerDemoService`
- IAM role: `AppRunnerECRAccessRole`

### 4. Synthesize CloudFormation Template

Generate the CloudFormation template to verify the infrastructure:

```bash
npm run synth
```

Review the output in `cdk.out/AppRunnerDemoStack.template.json`

### 5. Import Existing Resources (IMPORTANT)

Since you have an existing App Runner service managed by Terraform, you need to import it into CDK to avoid recreation:

```bash
# First, get the service ARN from your current deployment
aws apprunner list-services --region us-west-2

# Import the service into CDK
npx cdk import AppRunnerDemoStack
```

When prompted, provide:
- Resource identifier: The ARN of your existing App Runner service
- Resource type: `AWS::AppRunner::Service`

Alternatively, you can destroy the existing Terraform-managed service first:

```bash
# Using Terraform (before cleanup)
terraform destroy
```

Then deploy fresh with CDK:

```bash
# Use an existing image tag from ECR (check with: aws ecr describe-images --repository-name apprunner-demo)
COMMIT_SHA=$(git rev-parse HEAD)
IMAGE_IDENTIFIER=703671892588.dkr.ecr.us-west-2.amazonaws.com/apprunner-demo:$COMMIT_SHA \
COMMIT_SHA=$COMMIT_SHA \
npm run deploy
```

### 6. Deploy with CDK

```bash
IMAGE_IDENTIFIER=<your-ecr-image-uri> COMMIT_SHA=<commit-sha> npm run deploy
```

### 7. Verify Deployment

```bash
# Check stack status
npx cdk list

# View outputs
aws cloudformation describe-stacks --stack-name AppRunnerDemoStack --region us-west-2
```

### 8. Clean Up Terraform State (Optional)

After successful CDK deployment, you can clean up Terraform resources:

```bash
# Remove Terraform files
rm -f main.tf variables.tf outputs.tf
rm -rf .terraform
rm -f .terraform.lock.hcl

# Optionally remove Terraform state bucket (CAREFUL!)
# Only do this if you're sure you don't need to rollback
# aws s3 rb s3://apprunner-demo-terraform-state-703671892588 --force
# aws dynamodb delete-table --table-name apprunner-demo-terraform-locks --region us-west-2
```

## Key Differences

### Infrastructure Definition

**Terraform:**
```hcl
resource "aws_apprunner_service" "app" {
  service_name = var.apprunner_service_name
  # ...
}
```

**CDK:**
```typescript
const service = new apprunner.CfnService(this, 'AppRunnerService', {
  serviceName: props.appRunnerServiceName,
  // ...
});
```

### Variable Passing

**Terraform:**
- Variables defined in `variables.tf`
- Passed via CLI: `-var="key=value"`
- Or via `.tfvars` files

**CDK:**
- Environment variables: `IMAGE_IDENTIFIER`, `COMMIT_SHA`
- Or CDK context: `--context key=value`
- Type-safe props in TypeScript

### State Management

**Terraform:**
- Remote state in S3: `apprunner-demo-terraform-state-703671892588`
- State locking via DynamoDB: `apprunner-demo-terraform-locks`

**CDK:**
- CloudFormation manages state automatically
- Assets stored in CDK bootstrap bucket
- No separate state file needed

### Deployment

**Terraform:**
```bash
terraform init
terraform plan
terraform apply
```

**CDK:**
```bash
npm install
npm run synth  # optional - view template
npm run deploy
```

## GitHub Actions

The workflow has been updated to:
1. Setup Node.js 20
2. Install npm dependencies with `npm ci`
3. Deploy using `npm run cdk deploy -- --require-approval never`

No changes needed to AWS authentication or Docker build steps.

## Rollback Plan

If you need to rollback to Terraform:

1. The Terraform files are still in the repository (not deleted yet)
2. Re-run `terraform init` and `terraform apply`
3. Remove CDK-created resources:
   ```bash
   npx cdk destroy
   ```

## Benefits of CDK

1. **Type Safety**: TypeScript catches errors at compile time
2. **IDE Support**: IntelliSense, autocomplete, refactoring
3. **Programming Constructs**: Loops, conditionals, functions
4. **Less Boilerplate**: No variable files needed
5. **Better Testing**: Unit test infrastructure code
6. **CloudFormation Native**: Direct access to all AWS features

## Troubleshooting

### "Resource already exists" error
- The App Runner service exists from Terraform
- Solution: Import existing resources or destroy with Terraform first

### CDK Bootstrap error
- Run: `npx cdk bootstrap aws://703671892588/us-west-2`

### TypeScript compilation errors
- Run: `npm run build` to see detailed errors
- Check `tsconfig.json` configuration

### Permission errors
- Ensure GitHub Actions role has CloudFormation permissions
- CDK needs `cloudformation:*`, `s3:*`, `iam:PassRole`

### Image not found / Service fails to create
- Error: "Your service failed to create"
- Cause: The image tag specified doesn't exist in ECR
- Solution: Check existing images with:
  ```bash
  aws ecr describe-images --repository-name apprunner-demo --region us-west-2
  ```
- Use an existing tag (commit SHA) instead of `latest`

## Support

For issues or questions:
- CDK Documentation: https://docs.aws.amazon.com/cdk/
- CDK Examples: https://github.com/aws-samples/aws-cdk-examples
