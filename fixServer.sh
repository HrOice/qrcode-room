sed -i '' '/const dev = process.env.NODE_ENV !== '\''production'\'';/a\
if (!dev) {\
  // eslint-disable-next-line @typescript-eslint/no-require-imports\
  const { config } = require("./.next/required-server-files.json");\
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);\
}\
' .next/standalone/server.js