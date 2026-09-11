terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "Cartiva Mall"
      Environment = "staging"
      ManagedBy   = "Terraform"
    }
  }
}

module "cartiva_infra" {
  source = "../../"

  environment         = "staging"
  aws_region          = var.aws_region
  project_name        = var.project_name
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  kubernetes_version  = var.kubernetes_version
  node_instance_types = ["t3.medium", "t3a.medium"]
  node_min_size       = 2
  node_max_size       = 5
  node_desired_size   = 2
  domain_name         = "staging.cartiva.mall"
}
