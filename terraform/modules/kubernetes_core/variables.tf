variable "namespace" {
  description = "Kubernetes namespace name"
  type        = string
  default     = "cartiva"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "app_irsa_role_arn" {
  description = "IAM Role ARN for Service Account annotation"
  type        = string
}

variable "service_account_name" {
  description = "Kubernetes service account name"
  type        = string
  default     = "cartiva-api"
}
