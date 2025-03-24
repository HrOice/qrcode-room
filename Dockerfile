# 依赖阶段
FROM docker.m.daocloud.io/node:18-alpine AS deps
WORKDIR /app
RUN npm config set registry http://registry.npm.taobao.org/
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
RUN npx prisma generate

# 构建阶段
FROM docker.m.daocloud.io/node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
# 编译 TypeScript 文件
RUN npm run build
RUN npx tsc server.ts --esModuleInterop

# 运行阶段
FROM docker.m.daocloud.io/node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app

# 复制必要文件
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./

# 运行时生成 Prisma 客户端
RUN npm install prisma @prisma.client --registry=http://registry.npm.taobao.org/
RUN npx prisma generate

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]