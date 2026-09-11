variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "oidc_provider_arn" {
  description = "EKS OIDC Provider ARN"
  type        = string
}

variable "oidc_issuer_url" {
  description = "EKS OIDC Issuer URL"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace for application"
  type        = string
  default     = "cartiva"
}

variable "service_account_name" {
  description = "Kubernetes service account name"
  type        = string
  default     = "cartiva-api"
}
