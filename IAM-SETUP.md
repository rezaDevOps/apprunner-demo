# IAM Setup for GitHub Actions with CDK

This document describes the IAM configuration required for GitHub Actions to deploy using AWS CDK.

## Current IAM Role

**Role Name:** `GitHubAppRunnerDeployRole`
**Role ARN:** `arn:aws:iam::703671892588:role/GitHubAppRunnerDeployRole`

## Attached Policies

### 1. CDKGitHubActionsPolicy (Custom - Required for CDK)
**ARN:** `arn:aws:iam::703671892588:policy/CDKGitHubActionsPolicy`

Provides permissions for:
- ✅ SSM Parameter Store (CDK bootstrap version checking)
- ✅ Assuming CDK-created roles (deploy, file-publishing, etc.)
- ✅ CloudFormation operations
- ✅ S3 access to CDK asset buckets
- ✅ IAM PassRole for App Runner

**Policy Document:** See [cdk-github-actions-policy.json](cdk-github-actions-policy.json)

### 2. AWSAppRunnerFullAccess (AWS Managed)
**ARN:** `arn:aws:iam::aws:policy/AWSAppRunnerFullAccess`

Provides full access to AWS App Runner service.

### 3. AmazonEC2ContainerRegistryFullAccess (AWS Managed)
**ARN:** `arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess`

Provides full access to Amazon ECR for pushing/pulling Docker images.

### 4. AppRunnerTerraformIAMPolicy (Legacy - Can be removed)
**ARN:** `arn:aws:iam::703671892588:policy/AppRunnerTerraformIAMPolicy`

This was used for Terraform deployments and is no longer needed.

### 5. TerraformBackendAccessPolicy (Legacy - Can be removed)
**ARN:** `arn:aws:iam::703671892588:policy/TerraformBackendAccessPolicy`

Provided access to S3/DynamoDB for Terraform state. No longer needed with CDK.

## Trust Policy

The role trusts GitHub Actions via OIDC:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::703671892588:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:rezaDevOps/apprunner-demo:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

## Setup Instructions

### If Starting Fresh

1. **Create the OIDC Provider** (if not exists):
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

2. **Create the IAM Role**:
```bash
aws iam create-role \
  --role-name GitHubAppRunnerDeployRole \
  --assume-role-policy-document file://github-oidc-trust-policy.json
```

3. **Create and Attach the CDK Policy**:
```bash
aws iam create-policy \
  --policy-name CDKGitHubActionsPolicy \
  --policy-document file://cdk-github-actions-policy.json

aws iam attach-role-policy \
  --role-name GitHubAppRunnerDeployRole \
  --policy-arn arn:aws:iam::703671892588:policy/CDKGitHubActionsPolicy
```

4. **Attach AWS Managed Policies**:
```bash
aws iam attach-role-policy \
  --role-name GitHubAppRunnerDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AWSAppRunnerFullAccess

aws iam attach-role-policy \
  --role-name GitHubAppRunnerDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess
```

## Cleanup Legacy Terraform Policies

After confirming CDK deployments work, you can remove old Terraform policies:

```bash
# Detach legacy policies
aws iam detach-role-policy \
  --role-name GitHubAppRunnerDeployRole \
  --policy-arn arn:aws:iam::703671892588:policy/AppRunnerTerraformIAMPolicy

aws iam detach-role-policy \
  --role-name GitHubAppRunnerDeployRole \
  --policy-arn arn:aws:iam::703671892588:policy/TerraformBackendAccessPolicy

# Delete the policies
aws iam delete-policy \
  --policy-arn arn:aws:iam::703671892588:policy/AppRunnerTerraformIAMPolicy

aws iam delete-policy \
  --policy-arn arn:aws:iam::703671892588:policy/TerraformBackendAccessPolicy
```

## Required CDK Bootstrap Resources

CDK bootstrap creates these resources automatically:

- **S3 Bucket:** `cdk-hnb659fds-assets-703671892588-us-west-2`
- **ECR Repository:** `cdk-hnb659fds-container-assets-703671892588-us-west-2`
- **IAM Roles:**
  - `cdk-hnb659fds-deploy-role-703671892588-us-west-2`
  - `cdk-hnb659fds-file-publishing-role-703671892588-us-west-2`
  - `cdk-hnb659fds-image-publishing-role-703671892588-us-west-2`
  - `cdk-hnb659fds-lookup-role-703671892588-us-west-2`
- **SSM Parameter:** `/cdk-bootstrap/hnb659fds/version`

The `CDKGitHubActionsPolicy` allows GitHub Actions to access these resources.

## Troubleshooting

### "not authorized to perform: ssm:GetParameter"
- Ensure `CDKGitHubActionsPolicy` is attached to the role
- Verify the SSM parameter path matches the bootstrap version parameter

### "could not be used to assume cdk-*-deploy-role"
- The role needs `sts:AssumeRole` permission for `cdk-*` roles
- Check the `CDKAssumeRoles` statement in the policy

### "Access Denied" on CloudFormation operations
- Verify CloudFormation permissions in `CDKGitHubActionsPolicy`
- Ensure the stack name pattern matches (`AppRunnerDemoStack/*`)

## Security Best Practices

1. ✅ Use OIDC instead of long-lived access keys
2. ✅ Restrict trust policy to specific repository and branch
3. ✅ Use least-privilege IAM policies
4. ✅ Regularly audit and rotate policies
5. ✅ Remove unused legacy policies
