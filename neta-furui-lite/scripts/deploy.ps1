# ネタふるい Lite を GitHub Pages (gh-pages ブランチ) へデプロイする
# 実行: powershell -File scripts/deploy.ps1
$ErrorActionPreference = "Stop"
$appDir = Split-Path -Parent $PSScriptRoot
Set-Location $appDir

$env:DEPLOY_BASE = "/NetaChoice/"
npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

New-Item -ItemType File -Force "$appDir\dist\.nojekyll" | Out-Null

Set-Location "$appDir\dist"
if (-not (Test-Path ".git")) {
    git init -b gh-pages
    git config user.name "hero-kick"
    git config user.email "200866036+hero-kick@users.noreply.github.com"
}
git add -A
git commit -m "deploy: neta-furui-lite $(Get-Date -Format yyyy-MM-dd)"
git push --force https://github.com/hero-kick/NetaChoice.git gh-pages

Write-Host "デプロイ完了: https://hero-kick.github.io/NetaChoice/"
