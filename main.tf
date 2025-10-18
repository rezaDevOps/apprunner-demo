terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "apprunner-demo-terraform-state-703671892588"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "apprunner-demo-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ECR Repository - Reference existing repository
data "aws_ecr_repository" "app" {
  name = var.ecr_repository
}

# IAM Role for App Runner to access ECR (pre-existing, managed outside Terraform)
# This role must be created manually to avoid IAM propagation issues
data "aws_iam_role" "apprunner_ecr_access" {
  name = "AppRunnerECRAccessRole"
}

# App Runner Service
resource "aws_apprunner_service" "app" {
  service_name = var.apprunner_service_name

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_identifier      = var.image_identifier
      image_repository_type = "ECR"

      image_configuration {
        port = "8080"
        runtime_environment_variables = {
          COMMIT_SHA = var.commit_sha
        }
      }
    }

    auto_deployments_enabled = false
  }

  instance_configuration {
    cpu    = "1024"
    memory = "2048"
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  tags = {
    Name      = var.apprunner_service_name
    ManagedBy = "Terraform"
  }

}
