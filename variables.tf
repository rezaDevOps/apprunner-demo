variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "ecr_repository" {
  type    = string
  default = "apprunner-demo"
}

variable "apprunner_service_name" {
  type    = string
  default = "AppRunnerDemoService"
}

variable "image_identifier" {
  type = string
  description = "Full ECR image URI with tag (e.g., 123456789.dkr.ecr.eu-central-1.amazonaws.com/apprunner-demo:SHA)"
}

variable "commit_sha" {
  type        = string
  description = "Git commit SHA to inject into the container"
  default     = "unknown"
}

