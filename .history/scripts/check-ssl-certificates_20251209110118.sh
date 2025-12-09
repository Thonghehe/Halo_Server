#!/bin/bash

echo "=== Checking SSL Certificates ==="
echo ""

# Danh sách các domain cần kiểm tra
domains=(
    "api.halocrms.io.vn"
    "admin.halocrms.io.vn"
    "halocrms.io.vn"
)

for domain in "${domains[@]}"; do
    echo "📋 Checking certificate for: $domain"
    echo "   Path: /etc/letsencrypt/live/$domain/"
    
    # Kiểm tra trong container nginx
    if docker exec halo-nginx-ssl test -f "/etc/letsencrypt/live/$domain/fullchain.pem" 2>/dev/null; then
        echo "   ✅ Certificate files exist"
        
        # Lấy thông tin certificate
        echo "   Certificate details:"
        docker exec halo-nginx-ssl openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -noout -subject -dates 2>/dev/null | sed 's/^/      /'
        
        # Kiểm tra expiry
        expiry=$(docker exec halo-nginx-ssl openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ ! -z "$expiry" ]; then
            expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s 2>/dev/null)
            current_epoch=$(date +%s)
            days_left=$(( ($expiry_epoch - $current_epoch) / 86400 ))
            
            if [ $days_left -lt 30 ]; then
                echo "      ⚠️  WARNING: Certificate expires in $days_left days!"
            else
                echo "      ✅ Certificate valid for $days_left more days"
            fi
        fi
        
        # Kiểm tra SAN (Subject Alternative Names)
        echo "   SAN (Subject Alternative Names):"
        docker exec halo-nginx-ssl openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | sed 's/^/      /'
        
    else
        echo "   ❌ Certificate files NOT FOUND"
        echo "      Missing: /etc/letsencrypt/live/$domain/fullchain.pem"
    fi
    
    echo ""
done

echo "=== Checking Nginx SSL Configuration ==="
echo ""

# Kiểm tra nginx config
echo "Testing nginx configuration:"
docker exec halo-nginx-ssl nginx -t 2>&1 | sed 's/^/   /'

echo ""
echo "=== Checking Certificate Files in Host ==="
echo ""

# Kiểm tra trên host (nếu có)
if [ -d "./certbot/conf/live" ]; then
    echo "Local certificate files:"
    ls -la ./certbot/conf/live/ 2>/dev/null | sed 's/^/   /'
else
    echo "   No local certificate directory found"
fi

echo ""
echo "=== Summary ==="
echo ""

# Đếm số certificate có
cert_count=0
for domain in "${domains[@]}"; do
    if docker exec halo-nginx-ssl test -f "/etc/letsencrypt/live/$domain/fullchain.pem" 2>/dev/null; then
        cert_count=$((cert_count + 1))
    fi
done

echo "Found $cert_count out of ${#domains[@]} certificates"
echo ""

if [ $cert_count -lt ${#domains[@]} ]; then
    echo "⚠️  Some certificates are missing!"
    echo ""
    echo "To create missing certificates, run:"
    echo "  docker exec halo-certbot certbot certonly \\"
    echo "    --webroot \\"
    echo "    --webroot-path=/var/www/certbot \\"
    echo "    --email your-email@example.com \\"
    echo "    --agree-tos \\"
    echo "    --no-eff-email \\"
    echo "    -d admin.halocrms.io.vn"
fi

echo ""
echo "=== Done ==="

