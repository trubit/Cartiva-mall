locals {
  cluster_name = "${var.project_name}-${var.environment}-eks"
  namespace    = "cartiva"
}

# ─── VPC Module ──────────────────────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  cluster_name       = local.cluster_name
}

# ─── EKS Cluster Module ──────────────────────────────────────────────────────
module "eks" {
  source = "./modules/eks"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  kubernetes_version = var.kubernetes_version
  instance_types     = var.node_instance_types
  min_size           = var.node_min_size
  max_size           = var.node_max_size
  desired_size       = var.node_desired_size
}

# ─── ECR Module ──────────────────────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

# ─── IAM IRSA Module ─────────────────────────────────────────────────────────
module "iam" {
  source = "./modules/iam"

  project_name         = var.project_name
  environment          = var.environment
  oidc_provider_arn    = module.eks.oidc_provider_arn
  oidc_issuer_url      = module.eks.oidc_issuer_url
  namespace            = local.namespace
  service_account_name = "cartiva-api"
}

# ─── Kubernetes Core Module ──────────────────────────────────────────────────
module "kubernetes_core" {
  source = "./modules/kubernetes_core"

  environment          = var.environment
  namespace            = local.namespace
  app_irsa_role_arn    = module.iam.app_pod_role_arn
  service_account_name = "cartiva-api"

  depends_on = [module.eks]
}
