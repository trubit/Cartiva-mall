output "vpc_id" {
  value = module.cartiva_infra.vpc_id
}

output "eks_cluster_name" {
  value = module.cartiva_infra.eks_cluster_name
}

output "eks_cluster_endpoint" {
  value = module.cartiva_infra.eks_cluster_endpoint
}

output "ecr_repository_url" {
  value = module.cartiva_infra.ecr_repository_url
}
