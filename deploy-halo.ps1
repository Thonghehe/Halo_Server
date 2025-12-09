# File: deploy-halo.ps1
# Tự động commit, push code và deploy lên server Ubuntu

param(
    [string]$m = "Update code"
)

Write-Host "=== [1] Commit & Push code GitHub ===" -ForegroundColor Yellow
git add .
git commit -m "$m"
git push origin master

Write-Host "`n=== [2] SSH server & deploy Docker ===" -ForegroundColor Yellow

# Server info
$serverUser = "halo"
$serverHost = "192.168.0.9"
$serverPath = "/var/www/halo/Halo_BE"

# Lệnh chạy trên server
$remoteCmd = "cd $serverPath && git pull origin master &&  docker compose -f docker-compose.ssl.yml up -d --build"

# SSH
ssh "$serverUser@$serverHost" $remoteCmd

Write-Host "`n=== Deploy done! ===" -ForegroundColor Green
