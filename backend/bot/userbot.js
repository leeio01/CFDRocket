const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
require("dotenv").config();

// ================== ENV Vars ==================
const BOT_TOKEN = process.env.USER_BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

console.log("🚀 User Bot starting...");
console.log("Token:", BOT_TOKEN ? "Loaded" : "Missing");
console.log("MongoDB:", MONGO_URI ? "Loaded" : "Missing");

// ================== DB MODELS ==================
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

const userSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  name: String,
  phone: String,
  city: String,
  country: String,
  age: String,
  balance: { type: Number, default: 0 },
  wallets: {
    BTC: String,
    ETH: String,
    USDT: String,
  },
  transactions: [
    {
      type: String,
      amount: Number,
      status: String,
      date: { type: Date, default: Date.now },
    },
  ],
});

const User = mongoose.model("User", userSchema);

// ================== BOT INIT ==================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on("polling_error", (err) =>
  console.error("Polling error:", err.message)
);

// Simple logging for received messages
bot.on("message", (msg) => {
  console.log("📩 Received:", msg.text);
});

// ================== START ==================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  let user = await User.findOne({ chatId });
  if (!user) {
    user = new User({ chatId });
    await user.save();
    bot.sendMessage(
      chatId,
      "👋 Welcome to CFDROCKET Earning Bot!\n\nPlease complete your KYC."
    );
    askKYC(chatId);
  } else {
    bot.sendMessage(chatId, "👋 Welcome back!");
    showMainMenu(chatId);
  }
});

// ================== KYC FLOW ==================
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

            await User.findOneAndUpdate(
              { chatId },
              { name, phone, city, country, age },
              { new: true }
            );

            bot.sendMessage(
              chatId,
              `✅ KYC Completed!\n\nWelcome, ${name}.`
            );
            showMainMenu(chatId);
          });
        });
      });
    });
  });
}

// ================== MAIN MENU ==================
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

// ================== MENU ACTIONS ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  let user = await User.findOne({ chatId });

  if (!user) {
    bot.sendMessage(chatId, "❌ Please run /start first.");
    return;
  }

  // Deposit Wallets
  if (text === "💰 Deposit Wallets") {
    let wallets = user.wallets;

    if (!wallets?.BTC) {
      wallets = {
        BTC: "btc_wallet_" + chatId,
        ETH: "eth_wallet_" + chatId,
        USDT: "usdt_wallet_" + chatId,
      };
      user.wallets = wallets;
      await user.save();
    }

    let reply = "💰 Your Deposit Wallets:\n\n";
    for (const [coin, address] of Object.entries(wallets)) {
      reply += `${coin}: \`${address}\`\n`;
    }

    bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  }

  // My Balance
  if (text === "📈 My Balance") {
    bot.sendMessage(chatId, `📈 Balance: ${user.balance} USDT`);
  }

  // Transactions
  if (text === "📜 Transactions") {
    if (!user.transactions.length) {
      bot.sendMessage(chatId, "No transactions yet.");
    } else {
      let reply = "📜 Your Transactions:\n\n";
      user.transactions.forEach((tx) => {
        reply += `${tx.type} - ${tx.amount} USDT - ${tx.status} (${tx.date.toLocaleString()})\n`;
      });
      bot.sendMessage(chatId, reply);
    }
  }

  // Withdraw
  if (text === "💸 Withdraw") {
    bot.sendMessage(chatId, "Enter amount to withdraw:");
    bot.once("message", async (amtMsg) => {
      const amount = Number(amtMsg.text);

      if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, "❌ Invalid amount.");
        return;
      }

      user.transactions.push({
        type: "Withdraw",
        amount,
        status: "Pending",
      });
      user.balance -= amount; // deduct balance
      await user.save();

      bot.sendMessage(
        chatId,
        `💸 Withdrawal of ${amount} USDT requested. Processing...`
      );
    });
  }

  // Support
  if (text === "📞 Support") {
    bot.sendMessage(
      chatId,
      "📞 Contact support: @cfdrocket_support"
    );
  }
});
