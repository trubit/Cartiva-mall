$pkg = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "terraform.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pkg) {
    & $pkg.FullName $args
} else {
    Write-Error "terraform.exe not found in WinGet packages."
}
