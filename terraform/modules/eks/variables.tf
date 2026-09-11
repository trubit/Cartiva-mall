variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for worker nodes"
  type        = list(string)
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
}

variable "instance_types" {
  description = "Node group instance types"
  type        = list(string)
}

variable "min_size" {
  description = "Minimum nodes"
  type        = number
}

variable "max_size" {
  description = "Maximum nodes"
  type        = number
}

variable "desired_size" {
  description = "Desired nodes"
  type        = number
}
