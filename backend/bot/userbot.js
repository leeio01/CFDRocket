const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
require("dotenv").config();

// ENV Vars
const BOT_TOKEN = process.env.USER_BOT_TOKEN;
const API_BASE = process.env.API_BASE_URL; // e.g. "https://cfdrocket.vercel.app/api"

// Create Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    `👋 Welcome to CFDROCKET Earning Bot Demo!\n\nThis is for testing only. Let's begin with KYC.`
  );

  askKYC(chatId);
});

// ----------------- KYC FLOW -----------------
async function askKYC(chatId) {
  bot.sendMessage(chatId, "Please enter your Full Name:");
  bot.once("message", async (nameMsg) => {
    const name = nameMsg.text;

    bot.sendMessage(chatId, "Enter your Phone Number:");
    bot.once("message", async (phoneMsg) => {
      const phone = phoneMsg.text;

      bot.sendMessage(chatId, "Enter your City:");
      bot.once("message", async (cityMsg) => {
        const city = cityMsg.text;

        bot.sendMessage(chatId, "Enter your Country:");
        bot.once("message", async (countryMsg) => {
          const country = countryMsg.text;

          bot.sendMessage(chatId, "Enter your Age:");
          bot.once("message", async (ageMsg) => {
            const age = ageMsg.text;

            // Save to backend
            try {
              await axios.post(`${API_BASE}/kyc`, {
                chatId,
                name,
                phone,
                city,
                country,
                age,
              });

              bot.sendMessage(
                chatId,
                `✅ KYC Completed!\n\nWelcome, ${name}. Use the menu below.`
              );

              showMainMenu(chatId);
            } catch (err) {
              console.error(err.message);
              bot.sendMessage(chatId, "❌ Error saving KYC. Try again.");
            }
          });
        });
      });
    });
  });
}

// ----------------- MAIN MENU -----------------
function showMainMenu(chatId) {
  bot.sendMessage(chatId, "📍 Main Menu", {
    reply_markup: {
      keyboard: [
        ["💰 Deposit Wallets", "📈 My Balance"],
        ["📜 Transactions", "💸 Withdraw"],
        ["📞 Support"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });
}

// ----------------- MENU ACTIONS -----------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "💰 Deposit Wallets") {
    try {
      const res = await axios.get(`${API_BASE}/wallets?chatId=${chatId}`);
      const wallets = res.data; // {BTC:"...", ETH:"..."}

      let reply = "💰 Your Deposit Wallets (Demo):\n\n";
      for (const [coin, address] of Object.entries(wallets)) {
        reply += `${coin}: \`${address}\`\n`;
      }

      bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
    } catch (err) {
      bot.sendMessage(chatId, "❌ Could not fetch wallets.");
    }
  }

  if (text === "📈 My Balance") {
    try {
      const res = await axios.get(`${API_BASE}/balance?chatId=${chatId}`);
      bot.sendMessage(
        chatId,
        `📈 Demo Balance: ${res.data.balance} USDT (simulated)`
      );
    } catch (err) {
      bot.sendMessage(chatId, "❌ Could not fetch balance.");
    }
  }

  if (text === "📜 Transactions") {
    try {
      const res = await axios.get(`${API_BASE}/transactions?chatId=${chatId}`);
      let reply = "📜 Your Demo Transactions:\n\n";

      res.data.forEach((tx) => {
        reply += `${tx.type} - ${tx.amount} USDT - ${tx.status}\n`;
      });

      bot.sendMessage(chatId, reply || "No transactions yet.");
    } catch (err) {
      bot.sendMessage(chatId, "❌ Could not fetch transactions.");
    }
  }

  if (text === "💸 Withdraw") {
    bot.sendMessage(chatId, "Enter amount to withdraw:");
    bot.once("message", async (amtMsg) => {
      const amount = amtMsg.text;

      try {
        await axios.post(`${API_BASE}/withdraw`, { chatId, amount });

        bot.sendMessage(
          chatId,
          "💸 Withdrawal Requested (Demo). Processing... up to 30 mins."
        );
      } catch (err) {
        bot.sendMessage(chatId, "❌ Error requesting withdrawal.");
      }
    });
  }

  if (text === "📞 Support") {
    bot.sendMessage(
      chatId,
      "📞 Contact support: @YourSupportHandle (Demo Only)"
    );
  }
});
