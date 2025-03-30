FROM docker.m.daocloud.io/node:20-alpine AS deps
WORKDIR /app
RUN npm config set registry http://registry.npm.taobao.org/ && \
    npm i socket.io prisma @prisma/client uuid date-fns

FROM docker.m.daocloud.io/node:20-alpine
WORKDIR /app

# 复制 package.json 和 生产依赖
COPY ./ ./
COPY --from=deps /app/node_modules/ ./node_modules/

# 安装生产依赖
RUN npm config set registry http://registry.npm.taobao.org/ && \
    npx prisma generate

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "server.js"]