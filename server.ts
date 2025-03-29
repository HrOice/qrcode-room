import { createServer } from 'http';
// import { addAlias } from 'module-alias';
import next from 'next';
// import { join } from 'path';
import "tsconfig-paths/register";
import { parse } from 'url';
import { createSocketServer } from './src/lib/socket/server';

// 添加路径别名
// addAlias('@', join(__dirname));

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev, turbopack: true, dir: '.' })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  // 初始化 Socket 服务
  createSocketServer(server)

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000')
  })
})