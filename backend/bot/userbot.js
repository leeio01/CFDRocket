const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
require("dotenv").config();

// ================== ENV VARS ==================
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
  kycStep: { type: Number, default: 0 }, // track current KYC question
  kycAnswers: { type: Map, of: String }, // store temporary answers
});

const User = mongoose.model("User", userSchema);

// ================== BOT INIT ==================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
bot.on("polling_error", (err) => console.error("Polling error:", err.message));
console.log("✅ Bot polling started");

// ================== KYC QUESTIONS ==================
const kycFields = [
  { key: "full_name", question: "Enter your Full Name:" },
  { key: "email_address", question: "Enter your Email Address:" },
  { key: "phone_number", question: "Enter your Phone Number:" },
  { key: "city", question: "Enter your City:" },
  { key: "country", question: "Enter your Country:" },
  { key: "age", question: "Enter your Age:" },
];

// ================== START COMMAND ==================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  let user = await User.findOne({ chatId });
  if (!user) {
    user = new User({ chatId, balance: 1000, kycStep: 0, kycAnswers: {} });
    await user.save();
  }

  bot.sendMessage(chatId, `👋 Welcome ${user.name || ""}! Please complete your KYC.`);
  askNextKYCQuestion(chatId, user);
});

// ================== KYC FLOW ==================
async function askNextKYCQuestion(chatId, user) {
  // Load latest user state
  user = await User.findOne({ chatId });

  const step = user.kycStep;

  // All questions answered
  if (step >= kycFields.length) {
    // Save final answers
    const answers = Object.fromEntries(user.kycAnswers);
    await User.findOneAndUpdate(
      { chatId },
      {
        name: answers.full_name,
        email: answers.email_address,
        phone: answers.phone_number,
        city: answers.city,
        country: answers.country,
        age: answers.age,
        kycStep: 0,
        kycAnswers: {},
      },
      { new: true }
    );

    bot.sendMessage(chatId, `✅ KYC Completed! Welcome, ${answers.full_name}.`);
    showMainMenu(chatId);
    return;
  }

  const field = kycFields[step];
  bot.sendMessage(chatId, field.question);
}

// ================== HANDLE MESSAGES ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ignore /start here, handled separately
  if (text.startsWith("/start")) return;

  let user = await User.findOne({ chatId });
  if (!user) return;

  // Handle KYC flow if not completed
  if (user.kycStep < kycFields.length) {
    const field = kycFields[user.kycStep];

    // Validate email
    if (field.key === "email_address") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(text)) {
        return bot.sendMessage(chatId, "❌ Invalid email. Please enter a valid email:");
      }
    }

    // Save answer
    user.kycAnswers.set(field.key, text.trim());
    user.kycStep += 1;
    await user.save();

    // Ask next question
    return askNextKYCQuestion(chatId, user);
  }

  // ================== MAIN MENU ACTIONS ==================
  if (!user.wallets?.BTC && text === "💰 Deposit Wallets") {
    user.wallets = {
      BTC: "btc_wallet_" + chatId,
      ETH: "eth_wallet_" + chatId,
      USDT: "usdt_wallet_" + chatId,
    };
    await user.save();
  }

  if (text === "💰 Deposit Wallets") {
    let reply = "💰 Your Deposit Wallets:\n\n";
    for (const [coin, address] of Object.entries(user.wallets)) {
      reply += `${coin}: \`${address}\`\n`;
    }
    bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  } else if (text === "📈 My Balance") {
    bot.sendMessage(chatId, `📈 Balance: ${user.balance} USDT`);
  } else if (text === "📜 Transactions") {
    if (!user.transactions.length) {
      bot.sendMessage(chatId, "No transactions yet.");
    } else {
      let reply = "📜 Your Transactions:\n\n";
      user.transactions.forEach((tx) => {
        reply += `${tx.type} - ${tx.amount} USDT - ${tx.status} (${tx.date.toLocaleString()})\n`;
      });
      bot.sendMessage(chatId, reply);
    }
  } else if (text === "💸 Withdraw") {
    bot.sendMessage(chatId, "Enter amount to withdraw:");
    bot.once("message", async (amtMsg) => {
      const amount = Number(amtMsg.text);
      if (isNaN(amount) || amount <= 0) return bot.sendMessage(chatId, "❌ Invalid amount.");
      if (amount > user.balance) return bot.sendMessage(chatId, "❌ Insufficient balance.");

      user.transactions.push({ type: "Withdraw", amount, status: "Pending" });
      user.balance -= amount;
      await user.save();
      bot.sendMessage(chatId, `💸 Withdrawal of ${amount} USDT requested. Processing...`);
    });
  } else if (text === "📞 Support") {
    bot.sendMessage(chatId, "📞 Contact support: @YourSupportHandle");
  }
});

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
