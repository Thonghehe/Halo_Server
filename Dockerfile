# ./Dockerfile
FROM node:20-alpine

# Cài đặt các dependencies cho canvas và Chromium
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pixman-dev \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev \
    # Thêm các gói cho Chromium
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ttf-freefont \
    python3 \
    make \
    g++ \
    # Phông chữ tiếng Việt
    font-noto \
    font-noto-cjk \
    font-noto-extra

# Thiết lập biến môi trường cho Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

WORKDIR /usr/src/app
COPY package*.json ./

# Xóa puppeteer-core và cài đặt puppeteer mới
RUN npm uninstall puppeteer-core
RUN npm install puppeteer --save

# Cài đặt các phụ thuộc khác
RUN npm ci

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

# Sử dụng CMD với nodemon trong development
CMD ["npm", "run", "start"]
