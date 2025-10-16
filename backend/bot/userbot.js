const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
require("dotenv").config();
const Binance = require("node-binance-api");

const BOT_TOKEN = process.env.USER_BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;
const BINANCE_TESTNET = process.env.BINANCE_TESTNET === "true";

// ---------------- MongoDB ----------------
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB Error:", err.message));

// ---------------- Schemas ----------------
const userSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  email: { type: String, unique: true, required: true },
  name: String,
  phone: String,
  city: String,
  country: String,
  age: String,
  balance: { type: Number, default: 0 },
  wallets: { BTC: String, USDT_ERC20: String },
  transactions: [
    {
      type: { type: String },
      amount: Number,
      status: String,
      blockchain: String,
      address: String,
      txid: String,
      date: { type: Date, default: Date.now },
    },
  ],
});
const User = mongoose.model("User", userSchema);

const tradeLogSchema = new mongoose.Schema({
  symbol: String,
  side: String,
  entryPrice: Number,
  exitPrice: Number,
  pnl: Number,
  amountUSDT: Number,
  status: String,
  closedAt: Date,
  exposureSnapshot: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      share: Number,
    },
  ],
});
const TradeLog = mongoose.model("TradeLog", tradeLogSchema);

// ---------------- Binance Setup ----------------
const binance = new Binance().options({
  APIKEY: BINANCE_API_KEY,
  APISECRET: BINANCE_API_SECRET,
  test: BINANCE_TESTNET,
  family: 4,
  ...(BINANCE_TESTNET && {
    urls: { base: "https://testnet.binance.vision", stream: "wss://testnet.binance.vision/ws" },
  }),
});
binance.useServerTime();

// ---------------- Telegram Bot ----------------
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ---------------- KYC Questions ----------------
const kycQuestions = [
  { key: "name", question: "Enter your Full Name (First & Last):", validate: (txt) => txt.trim().split(" ").length >= 2 },
  { key: "phone", question: "Enter your Phone Number (+123456789):", validate: (txt) => /^\+?\d{5,15}$/.test(txt) },
  { key: "city", question: "Enter your City:", validate: (txt) => txt.trim().length > 0 },
  { key: "country", question: "Enter your Country:", validate: (txt) => txt.trim().length > 0 },
  { key: "age", question: "Enter your Age:", validate: (txt) => /^\d{1,3}$/.test(txt) },
];

// ---------------- Bot States ----------------
const userKYCState = {};
const userWithdrawState = {};
const userDepositState = {};

// ---------------- Helpers ----------------
function showMainMenu(chatId) {
  const keyboard = [
    ["💰 Deposit Wallets", "📈 My Balance"],
    ["📜 Transactions", "💸 Withdraw"],
    ["📊 Trades", "📞 Support"],
  ];
  bot.sendMessage(chatId, "Main Menu", { reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: false } });
}

function askNextKYC(chatId) {
  const state = userKYCState[chatId];
  if (!state) return;
  if (state.step >= kycQuestions.length) {
    User.findOneAndUpdate({ chatId }, state.answers, { new: true }).then((user) => {
      bot.sendMessage(chatId, `KYC Completed! Welcome, ${state.answers.name}.`);
      delete userKYCState[chatId];
      showMainMenu(chatId);
    });
    return;
  }
  const q = kycQuestions[state.step];
  bot.sendMessage(chatId, q.question);
}

// ---------------- /start Command ----------------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let user = await User.findOne({ chatId });

  if (user && !user.email) {
    await User.deleteOne({ chatId });
    user = null;
  }

  if (!user) {
    userKYCState[chatId] = { step: -1 };
    return bot.sendMessage(chatId, "Welcome! Please enter your email address (must be unique):");
  }

  const missingFields = ["name", "phone", "city", "country", "age"].filter((f) => !user[f]);
  if (missingFields.length > 0) {
    userKYCState[chatId] = { step: 0, answers: {} };
    bot.sendMessage(chatId, "Welcome! Please complete your KYC.");
    askNextKYC(chatId);
  } else {
    bot.sendMessage(chatId, `Welcome back, ${user.name || "user"}!`);
    showMainMenu(chatId);
  }
});

// ---------------- Message Handler ----------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text || text.startsWith("/start")) return;

  let user = await User.findOne({ chatId });
  if (!user) return bot.sendMessage(chatId, "Please run /start first.");

  // --- Email Step ---
  if (userKYCState[chatId]?.step === -1) {
    const email = text.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return bot.sendMessage(chatId, "Invalid email format.");
    const existing = await User.findOne({ email });
    if (existing) return bot.sendMessage(chatId, "Email already used.");
    await new User({ chatId, email }).save();
    userKYCState[chatId] = { step: 0, answers: {} };
    return askNextKYC(chatId);
  }

  // --- KYC Steps ---
  if (userKYCState[chatId]) {
    const state = userKYCState[chatId];
    const q = kycQuestions[state.step];
    if (!q.validate(text)) return bot.sendMessage(chatId, `Invalid input. ${q.question}`);
    state.answers[q.key] = text.trim();
    state.step++;
    return askNextKYC(chatId);
  }

  // --- Withdraw/Deposit Handlers omitted (keep your existing logic) ---

  // --- Menu Options ---
  switch (text) {
    case "💰 Deposit Wallets":
      if (!user.wallets?.BTC) {
        user.wallets = { BTC: "btc_" + chatId, USDT_ERC20: "usdt_erc20_" + chatId };
        await user.save();
      }
      return bot.sendMessage(chatId, "Select a deposit option:", { reply_markup: { inline_keyboard: [
        [{ text: "💎 BTC", callback_data: "deposit_BTC" }],
        [{ text: "💰 USDT-ERC20", callback_data: "deposit_USDT_ERC20" }],
        [{ text: "⬅️ Back to Menu", callback_data: "back_main" }]
      ]}});
    case "📈 My Balance": return bot.sendMessage(chatId, `Balance: ${user.balance} USDT`);
    case "📜 Transactions":
      if (!user.transactions.length) return bot.sendMessage(chatId, "No transactions yet.");
      let txReply = "Transactions:\n\n";
      user.transactions.forEach(tx => {
        const s = tx.status === "Pending" ? "Pending" : tx.status === "Completed" ? "Completed" : tx.status;
        txReply += `${tx.type} - ${tx.amount || 0} USDT - ${s} (${tx.date.toLocaleString()})\n`;
      });
      return bot.sendMessage(chatId, txReply);

    case "📊 Trades":
      // --- Fetch real trade logs for this user ---
      const trades = await TradeLog.find({ "exposureSnapshot.userId": user._id, status: "CLOSED" }).sort({ closedAt: -1 }).limit(20);
      if (!trades.length) return bot.sendMessage(chatId, "No trade logs found.");

      let tradeReply = "Your Last Trades:\n\n";
      trades.forEach(trade => {
        const snapshot = trade.exposureSnapshot.find(s => s.userId.equals(user._id));
        const userPnL = (trade.pnl * (snapshot.share / trade.amountUSDT)).toFixed(6);
        tradeReply += `${trade.symbol} | ${trade.side} | Entry:${trade.entryPrice} Exit:${trade.exitPrice} PnL:${userPnL} USDT\n`;
      });
      return bot.sendMessage(chatId, tradeReply);

    case "💸 Withdraw": userWithdrawState[chatId] = { step: 0 }; return bot.sendMessage(chatId, "Enter amount to withdraw:");
    case "📞 Support": return bot.sendMessage(chatId, "Contact support: @cfdrocket_support");
    default: showMainMenu(chatId);
  }
});

// ---------------- Callback Queries ----------------
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const user = await User.findOne({ chatId });
  if (!user) return bot.sendMessage(chatId, "Please run /start first.");

  if (data.startsWith("deposit_")) {
    const coin = data.split("_")[1];
    const walletAddr = user.wallets[coin] || `${coin.toLowerCase()}_${chatId}`;
    bot.sendMessage(chatId, `${coin} Deposit Address:\n${walletAddr}\nUpload proof (screenshot/TXID).`, {
      reply_markup: { inline_keyboard: [
        [{ text: "Copy Address", callback_data: "copy_" + walletAddr }],
        [{ text: "Back to Menu", callback_data: "back_main" }]
      ]}
    });
    userDepositState[chatId] = { coin, walletAddr };
    return;
  }

  if (data.startsWith("copy_")) {
    bot.answerCallbackQuery(query.id, { text: "Address copied (simulated)" });
    return;
  }

  if (data === "back_main") {
    showMainMenu(chatId);
    return;
  }
});
