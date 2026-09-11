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
      Environment = "prod"
      ManagedBy   = "Terraform"
    }
  }
}

module "cartiva_infra" {
  source = "../../"

  environment         = "prod"
  aws_region          = var.aws_region
  project_name        = var.project_name
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  kubernetes_version  = var.kubernetes_version
  node_instance_types = ["m5.large", "m5a.large", "c5.large"]
  node_min_size       = 3
  node_max_size       = 15
  node_desired_size   = 4
  domain_name         = "cartiva.mall"
}
