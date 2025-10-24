output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "apprunner_service_url" {
  value = aws_apprunner_service.app.service_url
}
