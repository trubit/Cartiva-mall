resource "kubernetes_namespace" "app" {
  metadata {
    name = var.namespace

    labels = {
      "app.kubernetes.io/name"             = "cartiva"
      "app.kubernetes.io/managed-by"       = "terraform"
      "environment"                        = var.environment
      "pod-security.kubernetes.io/enforce" = "restricted"
      "pod-security.kubernetes.io/audit"   = "restricted"
      "pod-security.kubernetes.io/warn"    = "restricted"
    }
  }
}

resource "kubernetes_service_account" "app" {
  metadata {
    name      = var.service_account_name
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      "eks.amazonaws.com/role-arn" = var.app_irsa_role_arn
    }

    labels = {
      "app.kubernetes.io/name"       = "cartiva-api"
      "app.kubernetes.io/managed-by" = "terraform"
      "environment"                  = var.environment
    }
  }

  automount_service_account_token = false
}
