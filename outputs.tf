output "apprunner_service_url" {
  description = "The URL of the App Runner service"
  value       = aws_apprunner_service.app.service_url
}

output "apprunner_service_arn" {
  description = "The ARN of the App Runner service"
  value       = aws_apprunner_service.app.arn
}

output "apprunner_service_id" {
  description = "The ID of the App Runner service"
  value       = aws_apprunner_service.app.service_id
}

output "apprunner_service_status" {
  description = "The status of the App Runner service"
  value       = aws_apprunner_service.app.status
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository"
  value       = data.aws_ecr_repository.app.repository_url
}
