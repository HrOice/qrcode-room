# 依赖阶段
FROM docker.m.daocloud.io/node:20-alpine AS deps
WORKDIR /app

# 仅复制依赖相关文件
COPY package*.json ./
RUN npm config set registry http://registry.npm.taobao.org/ && \
    npm install

# 构建阶段
FROM docker.m.daocloud.io/node:20-alpine
WORKDIR /app

# 复制 package.json 和 生产依赖
COPY package*.json ./
COPY prisma ./prisma/

# 安装生产依赖
RUN npm config set registry http://registry.npm.taobao.org/ && \
    npm ci --only=production && \
    npx prisma generate

# 复制构建产物
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "server.js"]