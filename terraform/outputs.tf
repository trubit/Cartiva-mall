output "vpc_id" {
  description = "The ID of the provisioned VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "eks_cluster_name" {
  description = "The name of the Amazon EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "The endpoint URL of the Amazon EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "The security group ID attached to the EKS cluster control plane"
  value       = module.eks.cluster_security_group_id
}

output "eks_oidc_issuer_url" {
  description = "The OIDC issuer URL for IAM Roles for Service Accounts"
  value       = module.eks.oidc_issuer_url
}

output "ecr_repository_url" {
  description = "The URL of the Amazon ECR container repository"
  value       = module.ecr.repository_url
}

output "ecr_repository_arn" {
  description = "The ARN of the Amazon ECR container repository"
  value       = module.ecr.repository_arn
}

output "app_irsa_role_arn" {
  description = "IAM Role ARN for Cartiva Kubernetes application pods"
  value       = module.iam.app_pod_role_arn
}
