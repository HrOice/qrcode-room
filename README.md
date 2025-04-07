npm i 安装环境

npm run dev 进入开发模式

npm run build 进行打包构建
之后运行npm run build:server进行应用体积优化

直接运行：进入.next/standalone中执行npm run start

docker运行：
打包好的应用在.next/standalone中
进入standalone文件夹进行docker镜像构建，执行 docker build -t qrroom .

构建完成后使用docker.sh中的脚本启动docker容器

访问localhost:3000即可使用

环境变量
``` 
DATABASE_URL="file:./prisma/dev.db" // 见prisma/schema.prisma
ROOM_EXPIRED="1800000" // 房间超时时间半小时
```