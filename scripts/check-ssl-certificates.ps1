# Script kiểm tra SSL certificates trên server

$serverUser = "halo"
$serverHost = "171.244.65.176"

Write-Host "=== Checking SSL Certificates on Server ===" -ForegroundColor Yellow
Write-Host ""

# Lệnh để chạy trên server
$remoteCmd = @"
domains=("api.halocrms.io.vn" "admin.halocrms.io.vn" "halocrms.io.vn")
echo "=== Checking SSL Certificates ==="
echo ""
for domain in `${domains[@]}; do
    echo "📋 Checking certificate for: `$domain"
    if docker exec halo-nginx-ssl test -f "/etc/letsencrypt/live/`$domain/fullchain.pem" 2>/dev/null; then
        echo "   ✅ Certificate files exist"
        echo "   Certificate details:"
        docker exec halo-nginx-ssl openssl x509 -in "/etc/letsencrypt/live/`$domain/fullchain.pem" -noout -subject -dates 2>/dev/null | sed 's/^/      /'
        echo "   SAN:"
        docker exec halo-nginx-ssl openssl x509 -in "/etc/letsencrypt/live/`$domain/fullchain.pem" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | sed 's/^/      /' || echo "      (No SAN)"
    else
        echo "   ❌ Certificate files NOT FOUND"
    fi
    echo ""
done
echo "=== Testing Nginx Config ==="
docker exec halo-nginx-ssl nginx -t
"@

# SSH vào server và chạy
Write-Host "Connecting to server..." -ForegroundColor Cyan
ssh "$serverUser@$serverHost" $remoteCmd

Write-Host ""
Write-Host "=== Check Complete ===" -ForegroundColor Green
