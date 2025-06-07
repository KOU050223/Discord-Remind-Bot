import { serve } from "@hono/node-server";
import healthCheckServer from "./server";
import { startHealthCheckCron } from "./cron";

// ... Discord BOTのコード ...

// Koyeb用のヘルスチェックサーバーを起動
serve({
  fetch: healthCheckServer.fetch,
  port: 8000,
});
startHealthCheckCron();
console.log("🚀 Discord Botが起動しました！");