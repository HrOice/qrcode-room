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

# 从依赖阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 生成 Prisma 客户端并构建应用
RUN npx prisma generate && \
    npm run build

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 暴露端口
EXPOSE 3000

# 使用 ts-node 启动服务
CMD ["npm", "start"]