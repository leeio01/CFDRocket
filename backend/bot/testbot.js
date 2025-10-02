const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const BOT_TOKEN = process.env.USER_BOT_TOKEN;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on("polling_error", (err) => console.error("Polling error:", err));

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Bot is alive!");
});
