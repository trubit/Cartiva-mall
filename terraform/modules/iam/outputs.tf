output "app_pod_role_arn" {
  description = "IAM Role ARN for application pods"
  value       = aws_iam_role.app_pod.arn
}

output "aws_lbc_role_arn" {
  description = "IAM Role ARN for AWS Load Balancer Controller"
  value       = aws_iam_role.aws_lbc.arn
}
