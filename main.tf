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

# ECR Repository - Use existing repository
data "aws_ecr_repository" "app" {
  name = var.ecr_repository
}

# IAM Role for App Runner Service (to pull from ECR)
resource "aws_iam_role" "apprunner_service_role" {
  name = "${var.apprunner_service_name}-ServiceRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Attach AWS managed policy for ECR access
resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Wait for IAM role to propagate globally (30 seconds should be enough now)
resource "time_sleep" "wait_for_iam" {
  depends_on = [
    aws_iam_role.apprunner_service_role,
    aws_iam_role_policy_attachment.apprunner_ecr_access
  ]

  create_duration = "30s"
}

# App Runner Service
resource "aws_apprunner_service" "app" {
  service_name = var.apprunner_service_name

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_service_role.arn
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

  depends_on = [
    time_sleep.wait_for_iam
  ]
}
