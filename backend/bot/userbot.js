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
  kycStep: { type: Number, default: 0 },
  kycAnswers: { type: Map, of: String },
});

const User = mongoose.model("User", userSchema);

// ================== BOT INIT ==================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
bot.on("polling_error", (err) => console.error("Polling error:", err.message));

// ================== KYC QUESTIONS ==================
const kycQuestions = [
  {
    key: "name",
    question: "Enter your Full Name (First & Last):",
    validate: (txt) => txt.trim().split(" ").length >= 2,
    errorMsg: "❌ Full Name must include at least first and last name.",
  },
  {
    key: "phone",
    question: "Enter your Phone Number (+123456789):",
    validate: (txt) => /^\+?\d{5,15}$/.test(txt),
    errorMsg: "❌ Invalid phone number format.",
  },
  {
    key: "city",
    question: "Enter your City:",
    validate: (txt) => txt.trim().length > 0,
    errorMsg: "❌ City cannot be empty.",
  },
  {
    key: "country",
    question: "Enter your Country:",
    validate: (txt) => txt.trim().length > 0,
    errorMsg: "❌ Country cannot be empty.",
  },
  {
    key: "age",
    question: "Enter your Age:",
    validate: (txt) => /^\d{1,3}$/.test(txt),
    errorMsg: "❌ Age must be a number.",
  },
];

// ================== START COMMAND ==================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let user = await User.findOne({ chatId });

  if (!user) {
    user = new User({ chatId, kycStep: 0, kycAnswers: {} });
    await user.save();
    bot.sendMessage(chatId, "👋 Welcome to CFDROCKET Earning Bot!\nPlease complete your KYC.");
    return askNextKYC(chatId);
  }

  if (user.kycStep < kycQuestions.length) {
    bot.sendMessage(chatId, "👋 Welcome back! Let's complete your KYC.");
    return askNextKYC(chatId);
  }

  bot.sendMessage(chatId, `👋 Welcome back, ${user.name}!`);
  showMainMenu(chatId);
});

// ================== KYC FLOW ==================
async function askNextKYC(chatId) {
  const user = await User.findOne({ chatId });
  if (!user) return;

  const step = user.kycStep;

  if (step >= kycQuestions.length) {
    // Save answers and reset step
    const answers = Object.fromEntries(user.kycAnswers);
    await User.findOneAndUpdate(
      { chatId },
      { ...answers, kycStep: 0, kycAnswers: {} },
      { new: true }
    );

    bot.sendMessage(chatId, `✅ KYC Completed! Welcome, ${answers.name}.`);
    return showMainMenu(chatId);
  }

  const q = kycQuestions[step];
  bot.sendMessage(chatId, q.question);
}

// ================== HANDLE MESSAGES ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text.startsWith("/start")) return; // Already handled

  const user = await User.findOne({ chatId });
  if (!user) return bot.sendMessage(chatId, "❌ Please run /start first.");

  // Handle KYC
  if (user.kycStep < kycQuestions.length) {
    const q = kycQuestions[user.kycStep];

    if (!q.validate(text)) {
      return bot.sendMessage(chatId, q.errorMsg + "\n" + q.question);
    }

    user.kycAnswers.set(q.key, text);
    user.kycStep += 1;
    await user.save();

    return askNextKYC(chatId);
  }

  // ================== MAIN MENU ACTIONS ==================
  if (text === "💰 Deposit Wallets") {
    if (!user.wallets?.BTC) {
      user.wallets = {
        BTC: "btc_" + chatId,
        ETH: "eth_" + chatId,
        USDT: "usdt_" + chatId,
      };
      await user.save();
    }

    let reply = "💰 Your Deposit Wallets:\n\n";
    for (const [coin, addr] of Object.entries(user.wallets)) {
      reply += `${coin}: \`${addr}\`\n`;
    }
    return bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  }

  if (text === "📈 My Balance") {
    return bot.sendMessage(chatId, `📈 Balance: ${user.balance} USDT`);
  }

  if (text === "📜 Transactions") {
    if (!user.transactions.length) return bot.sendMessage(chatId, "No transactions yet.");
    let reply = "📜 Your Transactions:\n\n";
    user.transactions.forEach((tx) => {
      reply += `${tx.type} - ${tx.amount} USDT - ${tx.status} (${tx.date.toLocaleString()})\n`;
    });
    return bot.sendMessage(chatId, reply);
  }

  if (text === "💸 Withdraw") {
    user.pendingWithdraw = true;
    return bot.sendMessage(chatId, "Enter amount to withdraw:");
  }

  if (user.pendingWithdraw) {
    const amount = Number(text);
    if (isNaN(amount) || amount <= 0) {
      return bot.sendMessage(chatId, "❌ Invalid amount. Enter a number:");
    }
    if (amount > user.balance) {
      return bot.sendMessage(chatId, "❌ Insufficient balance. Enter a valid amount:");
    }

    user.transactions.push({ type: "Withdraw", amount, status: "Pending" });
    user.balance -= amount;
    user.pendingWithdraw = false;
    await user.save();

    return bot.sendMessage(chatId, `💸 Withdrawal of ${amount} USDT requested. Processing...`);
  }

  if (text === "📞 Support") {
    return bot.sendMessage(chatId, "📞 Contact support: @cfdrocket_support");
  }

  // Unknown command
  bot.sendMessage(chatId, "❌ Unknown option. Please use the menu.");
});

// ================== MAIN MENU ==================
function showMainMenu(chatId) {
  const keyboard = [
    ["💰 Deposit Wallets", "📈 My Balance"],
    ["📜 Transactions", "💸 Withdraw"],
    ["📞 Support"],
  ];
  bot.sendMessage(chatId, "📍 Main Menu", {
    reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: false },
  });
}
