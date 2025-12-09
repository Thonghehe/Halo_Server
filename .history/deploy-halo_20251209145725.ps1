# File: deploy-halo.ps1
# Tự động commit, push code và deploy lên server Ubuntu

param(
    [string]$m = "Update code"
)

Write-Host "=== [1] Commit & Push code GitHub ===" -ForegroundColor Yellow
$branch = git branch --show-current
if (-not $branch) { $branch = "main" }
git add .
git commit -m "$m"
git push origin $branch

Write-Host "`n=== [2] SSH server & deploy Docker ===" -ForegroundColor Yellow

# Server info
$serverUser = "halo"
$serverHost = "171.244.65.176"
$serverPath = "/var/www/halo/Halo_BE"

# Lệnh chạy trên server
$remoteCmd = @"
cd $serverPath \
&& git pull origin $branch \
&& docker compose -f docker-compose.ssl.yml stop admin-panel public \
&& docker compose -f docker-compose.ssl.yml build --no-cache admin-panel public \
&& docker compose -f docker-compose.ssl.yml up -d admin-panel public \
&& docker exec halo-nginx-ssl nginx -s reload
"@

# SSH
ssh "$serverUser@$serverHost" $remoteCmd

Write-Host "`n=== Deploy done! ===" -ForegroundColor Green
