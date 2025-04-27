#!/bin/bash

# 创建临时目录
TEMP_DIR="temp_package"
mkdir -p $TEMP_DIR

# 复制必要文件
cp -r \
    src \
    prisma \
    public \
    .env.example \
    .gitignore \
    .dockerignore \
    backup-sqlite.sql \
    backup.sql \
    docker-compose.yml \
    docker.sh \
    Dockerfile \
    eslint.config.mjs \
    fixServer.sh \
    ng.conf \
    package-lock.json \
    postcss.config.mjs \
    server.ts \
    tsconfig.server.json \
    next.config.js \
    package.json \
    postcss.config.js \
    tailwind.config.ts \
    tsconfig.json \
    README.md \
    Dockerfile \
    $TEMP_DIR/

# 创建 zip 文件（使用当前日期作为文件名）
DATE=$(date +"%Y%m%d")
zip -r "qrcode_room_$DATE.zip" $TEMP_DIR

# 清理临时目录
rm -rf $TEMP_DIR

echo "打包完成: qrcode_room_$DATE.zip"