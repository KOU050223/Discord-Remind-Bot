import { serve } from "@hono/node-server";
import healthCheckServer from "./server";
import { startHealthCheckCron } from "./cron";
import { Client, GatewayIntentBits, TextChannel, ThreadChannel, REST, Routes, SlashCommandBuilder, Interaction } from "discord.js";
import cron, { ScheduledTask } from "node-cron";
import dotenv from "dotenv";
dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || ""; 
const THREAD_ID = process.env.THREAD_ID || "";
let NOTIFY_MESSAGE = process.env.NOTIFY_MESSAGE || "定期通知です！";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 0 * * *";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

let currentCronJob: ScheduledTask | null = null;

// 通知先スレッドIDのリスト
let threadIds: string[] = THREAD_ID ? [THREAD_ID] : [];

function setSchedule(cronExpr: string) {
  if (currentCronJob) {
    currentCronJob.stop();
  }
  currentCronJob = cron.schedule(cronExpr, async () => {
    for (const tid of threadIds) {
      try {
        const thread = await client.channels.fetch(tid);
        if (thread && (thread.isThread() || thread.isTextBased())) {
          (thread as ThreadChannel | TextChannel).send(NOTIFY_MESSAGE);
          console.log(`通知を送信しました: ${tid}`);
        } else {
          console.error(`スレッドが見つかりません: ${tid}`);
        }
      } catch (err) {
        console.error(`スレッド取得・送信エラー (${tid})`, err);
      }
    }
  }, {
    timezone: "Asia/Tokyo"
  });
  console.log(`新しいスケジュールで通知を設定しました: ${cronExpr} (Asia/Tokyo)`);
}

client.once("ready", () => {
  console.log(`🤖 Discord Bot ログイン完了: ${client.user?.tag}`);
  setSchedule(CRON_SCHEDULE);
});

// スラッシュコマンドの登録
const commands = [
  new SlashCommandBuilder()
    .setName("set-schedule")
    .setDescription("通知のcronスケジュールを設定します")
    .addStringOption(option =>
      option.setName("cron")
        .setDescription("cron式 例: 0 0 */2 * *")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("change-message")
    .setDescription("通知メッセージを変更します")
    .addStringOption(option =>
      option.setName("message")
        .setDescription("新しい通知メッセージ")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("add-thread")
    .setDescription("通知先スレッドを追加します")
    .addStringOption(option =>
      option.setName("thread_id")
        .setDescription("追加するスレッドID")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("delete-thread")
    .setDescription("通知先スレッドを削除します")
    .addStringOption(option =>
      option.setName("thread_id")
        .setDescription("削除するスレッドID")
        .setRequired(true)
    ),
].map(cmd => cmd.toJSON());

if (DISCORD_TOKEN && process.env.APPLICATION_ID && process.env.DISCORD_GUILD_ID) {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  (async () => {
    try {
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.APPLICATION_ID as string,
          process.env.DISCORD_GUILD_ID as string
        ),
        { body: commands }
      );
      console.log("スラッシュコマンドを登録しました");
    } catch (error) {
      console.error("スラッシュコマンド登録エラー", error);
    }
  })();
}

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "set-schedule") {
    const cronExpr = interaction.options.getString("cron");
    if (!cronExpr) {
      await interaction.reply({ content: "cron式を指定してください", ephemeral: true });
      return;
    }
    try {
      setSchedule(cronExpr);
      await interaction.reply({ content: `新しいスケジュールで通知を設定しました: ${cronExpr}` });
    } catch (e) {
      await interaction.reply({ content: "スケジュールの設定に失敗しました。cron式を確認してください。", ephemeral: true });
    }
  } else if (interaction.commandName === "change-message") {
    const newMsg = interaction.options.getString("message");
    if (!newMsg) {
      await interaction.reply({ content: "新しい通知メッセージを入力してください", ephemeral: true });
      return;
    }
    NOTIFY_MESSAGE = newMsg;
    await interaction.reply({ content: `通知メッセージを変更しました: ${newMsg}` });
  } else if (interaction.commandName === "add-thread") {
    const newThreadId = interaction.options.getString("thread_id");
    if (!newThreadId) {
      await interaction.reply({ content: "スレッドIDを入力してください", ephemeral: true });
      return;
    }
    if (threadIds.includes(newThreadId)) {
      await interaction.reply({ content: `既に登録されています: ${newThreadId}`, ephemeral: true });
      return;
    }
    threadIds.push(newThreadId);
    await interaction.reply({ content: `通知先スレッドを追加しました: ${newThreadId}` });
  } else if (interaction.commandName === "delete-thread") {
    const delThreadId = interaction.options.getString("thread_id");
    if (!delThreadId) {
      await interaction.reply({ content: "スレッドIDを入力してください", ephemeral: true });
      return;
    }
    if (!threadIds.includes(delThreadId)) {
      await interaction.reply({ content: `登録されていません: ${delThreadId}`, ephemeral: true });
      return;
    }
    threadIds = threadIds.filter(id => id !== delThreadId);
    await interaction.reply({ content: `通知先スレッドを削除しました: ${delThreadId}` });
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