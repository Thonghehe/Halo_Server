#!/bin/bash

# ============================================
# Script để lấy SSL Certificate từ Let's Encrypt
# ============================================
# 
# CÁCH SỬ DỤNG:
# 1. Sửa các biến domains và email bên dưới
# 2. Đảm bảo domain đã trỏ về IP server của bạn
# 3. Chạy: bash scripts/init-letsencrypt.sh
#
# LƯU Ý:
# - Lần đầu tiên, dùng staging=1 để test
# - Sau khi test OK, đổi staging=0 và chạy lại
# ============================================

# ==================== CẤU HÌNH ====================
# Domain của bạn
domains=(
    "api.halocrms.io.vn"
    "admin.halocrms.io.vn"
    "halocrms.io.vn"
)
email="haloappkey@gmail.com"  # Email để nhận thông báo từ Let's Encrypt (THAY ĐỔI EMAIL NÀY!)
staging=0  # Set to 1 for testing, 0 for production

# ==================== SCRIPT ====================
echo "============================================"
echo "Let's Encrypt SSL Certificate Setup"
echo "============================================"
echo ""

# Domain đã được cấu hình cho halocrms.io.vn
# Kiểm tra email đã được cập nhật chưa
if [[ "$email" == *"your-email@example.com"* ]]; then
    echo "⚠️  CẢNH BÁO: Bạn chưa cập nhật email!"
    echo "   Vui lòng sửa biến 'email' trong script này"
    echo ""
    read -p "Bạn có muốn tiếp tục với email mặc định? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "### Preparing folders..."
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

echo "### Downloading recommended TLS parameters..."
if [ ! -f "./certbot/conf/options-ssl-nginx.conf" ]; then
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "./certbot/conf/options-ssl-nginx.conf"
    echo "✓ Downloaded options-ssl-nginx.conf"
else
    echo "✓ options-ssl-nginx.conf already exists"
fi

if [ ! -f "./certbot/conf/ssl-dhparams.pem" ]; then
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "./certbot/conf/ssl-dhparams.pem"
    echo "✓ Downloaded ssl-dhparams.pem"
else
    echo "✓ ssl-dhparams.pem already exists"
fi

echo ""
echo "### Requesting Let's Encrypt certificate for:"
for domain in "${domains[@]}"; do
    echo "   - $domain"
done
echo ""

# Join domains for certbot
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Select appropriate email arg
case "$email" in
  ""|*your-email@example.com*) 
    echo "⚠️  Cảnh báo: Sử dụng email mặc định (không khuyến nghị)"
    email_arg="--register-unsafely-without-email" 
    ;;
  *) 
    email_arg="--email $email" 
    ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then 
    staging_arg="--staging"
    echo "⚠️  CHẾ ĐỘ TEST (Staging Mode) - Certificate sẽ không được tin cậy"
    echo "   Sau khi test OK, đổi staging=0 và chạy lại script"
    echo ""
else
    staging_arg=""
    echo "✓ CHẾ ĐỘ PRODUCTION - Certificate thật từ Let's Encrypt"
    echo ""
fi

# Kiểm tra nginx đã chạy chưa
if ! docker compose -f ../docker-compose.ssl.yml ps | grep -q "nginx-ssl.*Up"; then
    echo "### Starting nginx container..."
    docker compose -f ../docker-compose.ssl.yml up -d nginx-ssl
    echo "Waiting for nginx to be ready..."
    sleep 5
fi

echo "### Requesting certificate..."
docker compose -f ../docker-compose.ssl.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "✓ SUCCESS! SSL Certificate đã được cấp phát"
    echo "============================================"
    echo ""
echo "### Reloading nginx..."
docker compose -f ../docker-compose.ssl.yml exec nginx-ssl nginx -s reload
    
    if [ $staging = "1" ]; then
        echo ""
        echo "⚠️  LƯU Ý: Bạn đang dùng staging certificate (test)"
        echo "   Để lấy certificate thật:"
        echo "   1. Sửa staging=0 trong script này"
        echo "   2. Chạy lại: bash scripts/init-letsencrypt.sh"
    fi
else
    echo ""
    echo "============================================"
    echo "✗ ERROR: Không thể lấy certificate"
    echo "============================================"
    echo ""
    echo "Kiểm tra:"
    echo "1. Domain đã trỏ về IP server chưa?"
    echo "2. Port 80 đã mở chưa?"
    echo "3. Nginx container đã chạy chưa?"
    echo "4. Firewall có chặn port 80 không?"
    exit 1
fi
