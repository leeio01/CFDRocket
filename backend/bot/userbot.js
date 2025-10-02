// ================== userbot.js ==================
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
      type: { type: String }, // Withdraw or Deposit
      amount: Number,
      status: String, // Pending, Completed
      blockchain: String,
      address: String,
      txid: String,
      date: { type: Date, default: Date.now },
    },
  ],
});

const User = mongoose.model("User", userSchema);

// ================== BOT INIT ==================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
bot.on("polling_error", (err) => console.error("Polling error:", err.message));

// ================== KYC CONFIG ==================
const kycQuestions = [
  { key: "name", question: "Enter your Full Name (First & Last):", validate: (txt) => txt.trim().split(" ").length >= 2 },
  { key: "phone", question: "Enter your Phone Number (+123456789):", validate: (txt) => /^\+?\d{5,15}$/.test(txt) },
  { key: "city", question: "Enter your City:", validate: (txt) => txt.trim().length > 0 },
  { key: "country", question: "Enter your Country:", validate: (txt) => txt.trim().length > 0 },
  { key: "age", question: "Enter your Age:", validate: (txt) => /^\d{1,3}$/.test(txt) },
];

const userKYCState = {}; // chatId => { step, answers }
const userWithdrawState = {}; // chatId => { step, amount, address, blockchain }

// ================== START COMMAND ==================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let user = await User.findOne({ chatId });

  if (!user) {
    user = new User({ chatId });
    await user.save();
  }

  // Check if user needs KYC
  const missingFields = ["name","phone","city","country","age"].filter(f => !user[f]);
  if (missingFields.length > 0) {
    userKYCState[chatId] = { step: 0, answers: {} };
    bot.sendMessage(chatId, "👋 Welcome to CFDROCKET Earning Bot!\nPlease complete your KYC.");
    askNextKYC(chatId);
  } else {
    bot.sendMessage(chatId, `👋 Welcome back, ${user.name}!`);
    showMainMenu(chatId);
  }
});

// ================== KYC FLOW ==================
function askNextKYC(chatId) {
  const state = userKYCState[chatId];
  if (!state) return;

  if (state.step >= kycQuestions.length) {
    // Save all KYC answers to DB
    User.findOneAndUpdate({ chatId }, state.answers, { new: true }).then(() => {
      bot.sendMessage(chatId, `✅ KYC Completed! Welcome, ${state.answers.name}.`);
      delete userKYCState[chatId];
      showMainMenu(chatId);
    });
    return;
  }

  const q = kycQuestions[state.step];
  bot.sendMessage(chatId, q.question);
}

// ================== MESSAGE HANDLER ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith("/start")) return;

  let user = await User.findOne({ chatId });
  if (!user) return bot.sendMessage(chatId, "❌ Please run /start first.");

  // ===== KYC FLOW =====
  if (userKYCState[chatId]) {
    const state = userKYCState[chatId];
    const q = kycQuestions[state.step];

    if (!q.validate(text)) {
      return bot.sendMessage(chatId, `❌ Invalid input. ${q.question}`);
    }

    state.answers[q.key] = text.trim();
    state.step++;
    return askNextKYC(chatId);
  }

  // ===== WITHDRAW FLOW =====
  if (userWithdrawState[chatId]) {
    const state = userWithdrawState[chatId];

    switch(state.step) {
      case 0: // Amount
        const amount = Number(text);
        if (isNaN(amount) || amount <= 0) return bot.sendMessage(chatId, "❌ Invalid amount. Enter again:");
        if (amount > user.balance) return bot.sendMessage(chatId, "❌ Insufficient balance. Enter again:");
        state.amount = amount;
        state.step++;
        return bot.sendMessage(chatId, "Enter your deposit address:");
      case 1: // Address first
        state.address = text.trim();
        state.step++;
        return bot.sendMessage(chatId, "Confirm your deposit address again:");
      case 2: // Address confirmation
        if (state.address !== text.trim()) {
          state.step = 1;
          return bot.sendMessage(chatId, "❌ Addresses do not match. Enter your deposit address again:");
        }
        state.step++;
        return bot.sendMessage(chatId, "Enter blockchain (USDT-BEP / USDT-ERC20 / BTC / ETH / SOL):");
      case 3: // Blockchain
        const chain = text.trim().toUpperCase();
        const allowed = ["USDT-BEP","USDT-ERC20","BTC","ETH","SOL"];
        if (!allowed.includes(chain)) return bot.sendMessage(chatId, "❌ Invalid blockchain. Enter again:");
        state.blockchain = chain;

        // Save pending transaction
        user.transactions.push({
          type: "Withdraw",
          amount: state.amount,
          status: "Pending",
          address: state.address,
          blockchain: state.blockchain
        });
        user.balance -= state.amount;
        await user.save();

        delete userWithdrawState[chatId];
        bot.sendMessage(chatId, `💸 Withdrawal requested!\nAmount: ${state.amount}\nBlockchain: ${state.blockchain}\nPending approval by admin.`);

        return showMainMenu(chatId);
    }
    return;
  }

  // ===== MENU ACTIONS =====
  switch(text) {
    case "💰 Deposit Wallets":
      if (!user.wallets?.BTC) {
        user.wallets = { BTC: "btc_" + chatId, ETH: "eth_" + chatId, USDT: "usdt_" + chatId };
        await user.save();
      }
      let reply = "💰 Your Deposit Wallets:\n\n";
      for (const [coin,address] of Object.entries(user.wallets)) reply += `${coin}: \`${address}\`\n`;
      return bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });

    case "📈 My Balance":
      return bot.sendMessage(chatId, `📈 Balance: ${user.balance} USDT`);

    case "📜 Transactions":
      if (!user.transactions.length) return bot.sendMessage(chatId, "No transactions yet.");
      let txReply = "📜 Transactions:\n\n";
      user.transactions.forEach(tx => { txReply += `${tx.type} - ${tx.amount} USDT - ${tx.status} - ${tx.blockchain || ''} (${tx.date.toLocaleString()})\n`; });
      return bot.sendMessage(chatId, txReply);

    case "💸 Withdraw":
      userWithdrawState[chatId] = { step: 0 };
      return bot.sendMessage(chatId, "Enter amount to withdraw:");

    case "📞 Support":
      return bot.sendMessage(chatId, "📞 Contact support: @cfdrocket_support");

    default:
      return;
  }
});

// ================== MAIN MENU ==================
function showMainMenu(chatId) {
  const keyboard = [
    ["💰 Deposit Wallets", "📈 My Balance"],
    ["📜 Transactions", "💸 Withdraw"],
    ["📞 Support"]
  ];
  bot.sendMessage(chatId, "📍 Main Menu", {
    reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: false }
  });
}
