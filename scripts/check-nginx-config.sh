#!/bin/bash

echo "=== Checking Nginx Configuration ==="
echo ""

echo "1. Checking if SSL certificates exist:"
echo "   - api.halocrms.io.vn:"
ls -la /etc/letsencrypt/live/api.halocrms.io.vn/ 2>/dev/null && echo "     ✅ Found" || echo "     ❌ Not found"
echo "   - admin.halocrms.io.vn:"
ls -la /etc/letsencrypt/live/admin.halocrms.io.vn/ 2>/dev/null && echo "     ✅ Found" || echo "     ❌ Not found"
echo "   - halocrms.io.vn:"
ls -la /etc/letsencrypt/live/halocrms.io.vn/ 2>/dev/null && echo "     ✅ Found" || echo "     ❌ Not found"
echo ""

echo "2. Checking containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "halo-admin-panel|halo-public|halo-backend|halo-nginx"
echo ""

echo "3. Testing nginx config:"
docker exec halo-nginx-ssl nginx -t
echo ""

echo "4. Checking nginx logs (last 20 lines):"
docker logs halo-nginx-ssl --tail 20
echo ""

echo "=== Done ==="

