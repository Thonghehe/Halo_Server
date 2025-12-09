#!/bin/bash

echo "=== Fixing Admin Domain Routing ==="
echo ""

# Kiểm tra SSL certificate cho admin.halocrms.io.vn
echo "1. Checking SSL certificates:"
if [ -f "/etc/letsencrypt/live/admin.halocrms.io.vn/fullchain.pem" ]; then
    echo "   ✅ SSL certificate for admin.halocrms.io.vn exists"
else
    echo "   ❌ SSL certificate for admin.halocrms.io.vn NOT FOUND"
    echo ""
    echo "   Creating SSL certificate..."
    docker exec halo-certbot certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email admin@halocrms.io.vn \
        --agree-tos \
        --no-eff-email \
        -d admin.halocrms.io.vn
fi

echo ""
echo "2. Checking containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "halo-admin-panel|halo-public|halo-nginx"

echo ""
echo "3. Testing nginx config:"
docker exec halo-nginx-ssl nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "4. Reloading nginx..."
    docker exec halo-nginx-ssl nginx -s reload
    echo "   ✅ Nginx reloaded"
else
    echo "   ❌ Nginx config test failed"
fi

echo ""
echo "=== Done ==="

