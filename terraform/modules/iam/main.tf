# Stripped OIDC URL without protocol for condition matching
locals {
  oidc_issuer_clean = replace(var.oidc_issuer_url, "https://", "")
}

# IAM Role for Cartiva Pods (IRSA)
resource "aws_iam_role" "app_pod" {
  name = "${var.project_name}-${var.environment}-app-pod-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.oidc_issuer_clean}:sub" = "system:serviceaccount:${var.namespace}:${var.service_account_name}"
            "${local.oidc_issuer_clean}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Least-privilege policy for application pods (S3 media uploads, CloudWatch metrics, SecretsManager if enabled)
resource "aws_iam_policy" "app_pod" {
  name        = "${var.project_name}-${var.environment}-app-pod-policy"
  description = "Permissions for Cartiva application pods"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-${var.environment}-assets",
          "arn:aws:s3:::${var.project_name}-${var.environment}-assets/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_pod" {
  policy_arn = aws_iam_policy.app_pod.arn
  role       = aws_iam_role.app_pod.name
}

# IRSA for AWS Load Balancer Controller
resource "aws_iam_role" "aws_lbc" {
  name = "${var.project_name}-${var.environment}-aws-lbc-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.oidc_issuer_clean}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${local.oidc_issuer_clean}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}
