output "namespace_name" {
  description = "Name of the created Kubernetes namespace"
  value       = kubernetes_namespace.app.metadata[0].name
}

output "service_account_name" {
  description = "Name of the created Kubernetes ServiceAccount"
  value       = kubernetes_service_account.app.metadata[0].name
}
