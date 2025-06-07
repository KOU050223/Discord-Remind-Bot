import { serve } from "@hono/node-server";
import healthCheckServer from "./server";
import { startHealthCheckCron } from "./cron";
import { Client, GatewayIntentBits, TextChannel, ThreadChannel } from "discord.js";
import cron, { ScheduledTask } from "node-cron";
import dotenv from "dotenv";
dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || ""; 
const THREAD_ID = process.env.THREAD_ID || "";
const NOTIFY_MESSAGE = process.env.NOTIFY_MESSAGE || "定期通知です！";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 0 * * *"; // .envにCRON_SCHEDULE=xxxを記載（デフォルトは毎日0時）

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

let currentCronJob: ScheduledTask | null = null;

function setSchedule(cronExpr: string) {
  if (currentCronJob) {
    currentCronJob.stop();
  }
  currentCronJob = cron.schedule(cronExpr, async () => {
    try {
      const thread = await client.channels.fetch(THREAD_ID);
      if (thread && (thread.isThread() || thread.isTextBased())) {
        (thread as ThreadChannel | TextChannel).send(NOTIFY_MESSAGE);
        console.log("通知を送信しました");
      } else {
        console.error("スレッドが見つかりません");
      }
    } catch (err) {
      console.error("スレッド取得・送信エラー", err);
    }
  });
  console.log(`新しいスケジュールで通知を設定しました: ${cronExpr}`);
}

client.once("ready", () => {
  console.log(`🤖 Discord Bot ログイン完了: ${client.user?.tag}`);
  setSchedule(CRON_SCHEDULE);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("/set-schedule") || message.author.bot) return;
  const args = message.content.replace("/set-schedule", "").trim();
  if (!args) {
    message.reply("cron式を指定してください 例: /set-schedule 0 0 */2 * *");
    return;
  }
  try {
    setSchedule(args);
    message.reply(`新しいスケジュールで通知を設定しました: ${args}`);
  } catch (e) {
    message.reply("スケジュールの設定に失敗しました。cron式を確認してください。");
  }
});

// Koyeb用のヘルスチェックサーバーを起動
serve({
  fetch: healthCheckServer.fetch,
  port: 8000,
});
startHealthCheckCron();
console.log("🚀 Discord Botが起動しました！");
client.login(DISCORD_TOKEN);