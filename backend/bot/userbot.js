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
  email: { type: String, unique: true, sparse: true },
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
bot.on("polling_error", (err) => console.error("Polling error:", err.message));
bot.on("message", (msg) => console.log("📩 Received:", msg.text));

// ================== START ==================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    let user = await User.findOne({ chatId });
    if (!user) {
      user = new User({ chatId, balance: 1000 });
      await user.save();
    }

    bot.sendMessage(
      chatId,
      `👋 Welcome ${user.name || ""}!\nPlease complete your KYC.`
    );
    askKYC(chatId, user);
  } catch (err) {
    console.error("❌ User creation error:", err.message);
    bot.sendMessage(chatId, "❌ Error creating your profile. Try again.");
  }
});

// ================== KYC FLOW ==================
async function askKYC(chatId, user) {
  const fields = ["Full Name", "Email Address", "Phone Number", "City", "Country", "Age"];
  const answers = {};
  let i = 0;

  const askNext = () => {
    if (i < fields.length) {
      bot.sendMessage(chatId, `Enter your ${fields[i]}:`);

      bot.once("message", async (msg) => {
        const key = fields[i].toLowerCase().replace(/ /g, "_");
        let value = msg.text.trim();

        // Validate email
        if (key === "email_address") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            bot.sendMessage(chatId, "❌ Invalid email. Please enter a valid email:");
            return askNext(); // ask again
          }
        }

        answers[key] = value;
        i++;
        askNext();
      });
    } else {
      saveKYC(chatId, answers, user);
    }
  };

  askNext();
}

async function saveKYC(chatId, data, user) {
  try {
    await User.findOneAndUpdate(
      { chatId },
      {
        name: data.full_name,
        email: data.email_address,
        phone: data.phone_number,
        city: data.city,
        country: data.country,
        age: data.age,
      },
      { new: true, upsert: true }
    );

    bot.sendMessage(chatId, `✅ KYC Completed!\nWelcome, ${data.full_name}.`);
    showMainMenu(chatId);
  } catch (err) {
    console.error("❌ KYC Save Error:", err.message);
    bot.sendMessage(chatId, "❌ Error saving KYC. Try again.");
  }
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
  const user = await User.findOne({ chatId });
  if (!user) return;

  // Deposit Wallets
  if (text === "💰 Deposit Wallets") {
    if (!user.wallets?.BTC) {
      user.wallets = {
        BTC: "btc_wallet_" + chatId,
        ETH: "eth_wallet_" + chatId,
        USDT: "usdt_wallet_" + chatId,
      };
      await user.save();
    }

    let reply = "💰 Your Deposit Wallets:\n\n";
    for (const [coin, address] of Object.entries(user.wallets)) {
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
        return bot.sendMessage(chatId, "❌ Invalid amount.");
      }
      if (amount > user.balance) {
        return bot.sendMessage(chatId, "❌ Insufficient balance.");
      }

      user.transactions.push({
        type: "Withdraw",
        amount,
        status: "Pending",
      });
      user.balance -= amount;
      await user.save();

      bot.sendMessage(chatId, `💸 Withdrawal of ${amount} USDT requested. Processing...`);
    });
  }

  // Support
  if (text === "📞 Support") {
    bot.sendMessage(chatId, "📞 Contact support: @YourSupportHandle");
  }
});
