
docker run -d \
  --restart unless-stopped \
  -p 3000:3000 \
  --network npm_network \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="file:/app/dev.db" \
  -e ROOM_EXPIRED="1800000" \
  -v /root/qr/dev.db:/app/prisma/dev.db \
  --name qrcode-room \
  qrroom