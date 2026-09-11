# Validate Terraform formatting
Write-Host "=== 1. Validating Terraform Formatting ===" -ForegroundColor Cyan
powershell -File scripts/run-tf.ps1 -chdir=terraform fmt -check -recursive
if ($LASTEXITCODE -ne 0) {
    Write-Error "Terraform fmt check failed."
    exit 1
}
Write-Host "Terraform fmt OK" -ForegroundColor Green

# Validate Root Module
Write-Host "`n=== 2. Validating Terraform Root Module ===" -ForegroundColor Cyan
powershell -File scripts/run-tf.ps1 -chdir=terraform validate
if ($LASTEXITCODE -ne 0) {
    Write-Error "Terraform root module validation failed."
    exit 1
}
Write-Host "Terraform Root Module OK" -ForegroundColor Green

# Validate Environments
$environments = @('dev', 'staging', 'prod')
foreach ($e in $environments) {
    Write-Host "`n=== 3. Validating Terraform Environment: $e ===" -ForegroundColor Cyan
    powershell -File scripts/run-tf.ps1 -chdir="terraform/environments/$e" init -backend=false
    powershell -File scripts/run-tf.ps1 -chdir="terraform/environments/$e" validate
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform environment $e validation failed."
        exit 1
    }
    Write-Host "Environment $e OK" -ForegroundColor Green
}

# Validate Kubernetes Kustomize Overlays
Write-Host "`n=== 4. Validating Kubernetes Manifests (Kustomize) ===" -ForegroundColor Cyan
kubectl kustomize k8s/base | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "K8s base validation failed"; exit 1 }
Write-Host "K8s Base OK" -ForegroundColor Green

kubectl kustomize k8s/overlays/development | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "K8s dev overlay validation failed"; exit 1 }
Write-Host "K8s Dev Overlay OK" -ForegroundColor Green

kubectl kustomize k8s/overlays/staging | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "K8s staging overlay validation failed"; exit 1 }
Write-Host "K8s Staging Overlay OK" -ForegroundColor Green

kubectl kustomize k8s/overlays/production | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "K8s prod overlay validation failed"; exit 1 }
Write-Host "K8s Prod Overlay OK" -ForegroundColor Green

Write-Host "`n>>> ALL INFRASTRUCTURE (TERRAFORM + KUBERNETES) VALIDATED SUCCESSFULLY! <<<" -ForegroundColor Green
