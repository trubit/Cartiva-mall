terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
  # Remote state backend configuration template (S3 + DynamoDB locking)
  # backend "s3" {
  #   bucket         = "cartiva-terraform-state-dev"
  #   key            = "dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "cartiva-terraform-locks-dev"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "Cartiva Mall"
      Environment = "dev"
      ManagedBy   = "Terraform"
    }
  }
}

module "cartiva_infra" {
  source = "../../"

  environment         = "dev"
  aws_region          = var.aws_region
  project_name        = var.project_name
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  kubernetes_version  = var.kubernetes_version
  node_instance_types = ["t3.medium"]
  node_min_size       = 1
  node_max_size       = 3
  node_desired_size   = 1
  domain_name         = "dev.cartiva.mall"
}
