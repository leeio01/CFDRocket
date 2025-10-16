const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Binance = require("node-binance-api");
require("dotenv").config();

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

// ---------------- User Schema ----------------
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

// ---------------- Binance Setup ----------------
const binance = new Binance().options({
  APIKEY: BINANCE_API_KEY,
  APISECRET: BINANCE_API_SECRET,
  test: BINANCE_TESTNET,
  family: 4,
  ...(BINANCE_TESTNET && {
    urls: {
      base: "https://testnet.binance.vision",
      stream: "wss://testnet.binance.vision/ws",
    },
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

// ---------------- Bot Helpers ----------------
function askNextKYC(chatId) {
  const state = userKYCState[chatId];
  if (!state) return;

  // All KYC done
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

function showMainMenu(chatId) {
  const keyboard = [
    ["💰 Deposit Wallets", "📈 My Balance"],
    ["📜 Transactions", "💸 Withdraw"],
    ["📊 Trades", "📞 Support"],
  ];
  bot.sendMessage(chatId, "Main Menu", { reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: false } });
}

function getBalances() {
  return new Promise((res, rej) => binance.balance((e, b) => (e ? rej(e) : res(b))));
}
function placeMarketBuy(symbol, qty) {
  return new Promise((res, rej) => binance.marketBuy(symbol, qty, (e, r) => (e ? rej(e) : res(r))));
}
function placeMarketSell(symbol, qty) {
  return new Promise((res, rej) => binance.marketSell(symbol, qty, (e, r) => (e ? rej(e) : res(r))));
}
function getOpenOrders(symbol = "") {
  return new Promise((res, rej) => binance.openOrders(symbol, (e, o) => (e ? rej(e) : res(o))));
}

// ---------------- /start Command ----------------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let user = await User.findOne({ chatId });

  // Delete user if exists but missing email
  if (user && !user.email) {
    await User.deleteOne({ chatId });
    user = null;
  }

  if (!user) {
    // Ask for email first
    userKYCState[chatId] = { step: -1 }; // step -1 = ask email
    return bot.sendMessage(chatId, "Welcome! Please enter your email address (must be unique):");
  }

  // Check KYC
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

  // Step -1: Email input
  if (userKYCState[chatId]?.step === -1) {
    const email = text.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return bot.sendMessage(chatId, "Invalid email format. Enter a valid email:");

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) return bot.sendMessage(chatId, "This email is already used. Enter a different email:");

    // Create user with email
    const newUser = new User({ chatId, email });
    await newUser.save();

    delete userKYCState[chatId];
    bot.sendMessage(chatId, `Email saved: ${email}\nNow let's continue KYC.`);
    userKYCState[chatId] = { step: 0, answers: {} };
    return askNextKYC(chatId);
  }

  // KYC steps
  if (userKYCState[chatId]) {
    const state = userKYCState[chatId];
    const q = kycQuestions[state.step];
    if (!q.validate(text)) return bot.sendMessage(chatId, `Invalid input. ${q.question}`);
    state.answers[q.key] = text.trim();
    state.step++;
    return askNextKYC(chatId);
  }

  // ---------------- Deposit Handler ----------------
  if (userDepositState[chatId]) {
    const state = userDepositState[chatId];
    let proof = msg.photo ? msg.photo[msg.photo.length - 1].file_id : text;
    if (!proof) return bot.sendMessage(chatId, "Send screenshot or TXID as proof.");
    user.transactions.push({ type: "Deposit", amount: 0, status: "Pending", blockchain: state.coin, address: state.walletAddr, txid: proof });
    await user.save();
    delete userDepositState[chatId];
    return bot.sendMessage(chatId, "Deposit proof received! Pending admin review.", showMainMenu(chatId));
  }

  // ---------------- Withdraw Handler ----------------
  if (userWithdrawState[chatId]) {
    const state = userWithdrawState[chatId];
    switch (state.step) {
      case 0:
        if (text.toLowerCase() === "exit") { delete userWithdrawState[chatId]; return bot.sendMessage(chatId, "Withdrawal canceled."); }
        const amt = Number(text);
        if (isNaN(amt) || amt <= 0) return bot.sendMessage(chatId, "Invalid amount. Enter again or type 'Exit'");
        if (amt > user.balance) return bot.sendMessage(chatId, "Insufficient balance. Enter again or type 'Exit'");
        state.amount = amt; state.step++; return bot.sendMessage(chatId, "Enter your deposit address:");
      case 1:
        state.address = text.trim(); state.step++; return bot.sendMessage(chatId, "Confirm your deposit address again:");
      case 2:
        if (state.address !== text.trim()) { state.step = 1; return bot.sendMessage(chatId, "Addresses do not match. Enter again:"); }
        state.step++; return bot.sendMessage(chatId, "Enter blockchain (USDT-BEP / USDT-ERC20 / BTC / ETH / SOL):");
      case 3:
        const chain = text.trim().toUpperCase();
        if (!["USDT-BEP", "USDT-ERC20", "BTC", "ETH", "SOL"].includes(chain)) return bot.sendMessage(chatId, "Invalid blockchain. Enter again:");
        state.blockchain = chain;
        user.transactions.push({ type: "Withdraw", amount: state.amount, status: "Pending", address: state.address, blockchain: state.blockchain });
        user.balance -= state.amount; await user.save();
        delete userWithdrawState[chatId];
        bot.sendMessage(chatId, `Withdrawal requested!\nAmount:${state.amount}\nBlockchain:${state.blockchain}\nPending admin approval.`);
        return showMainMenu(chatId);
    }
  }

  // ---------------- Menu Options ----------------
  switch (text) {
    case "💰 Deposit Wallets":
      if (!user.wallets?.BTC) { user.wallets = { BTC: "btc_" + chatId, USDT_ERC20: "usdt_erc20_" + chatId }; await user.save(); }
      return bot.sendMessage(chatId, "Select a deposit option:", { reply_markup: { inline_keyboard: [
        [{ text: "💎 BTC", callback_data: "deposit_BTC" }],
        [{ text: "💰 USDT-ERC20", callback_data: "deposit_USDT_ERC20" }],
        [{ text: "⬅️ Back to Menu", callback_data: "back_main" }]
      ]}});
    case "📈 My Balance": return bot.sendMessage(chatId, `Balance: ${user.balance} USDT`);
    case "📜 Transactions":
      if (!user.transactions.length) return bot.sendMessage(chatId, "No transactions yet.");
      let txReply = "Transactions:\n\n"; user.transactions.forEach(tx => { const s = tx.status === "Pending" ? "Pending" : tx.status === "Completed" ? "Completed" : tx.status; txReply += `${tx.type} - ${tx.amount} USDT - ${s} (${tx.date.toLocaleString()})\n`; });
      return bot.sendMessage(chatId, txReply);
    case "💸 Withdraw": userWithdrawState[chatId] = { step: 0 }; return bot.sendMessage(chatId, "Enter amount to withdraw:");
    case "📊 Trades":
  if (!user.transactions || user.transactions.length === 0) {
    return bot.sendMessage(chatId, "No trades yet.");
  }

  // Filter only P&L trades
  const tradeLogs = user.transactions
    .filter(tx => tx.type === "P&L")
    .map(tx => {
      const profitLoss = tx.amount.toFixed(4);
      const sign = profitLoss > 0 ? "+" : "";
      return `${tx.date.toLocaleString()} | ${tx.note} | ${sign}${profitLoss} USDT`;
    })
    .slice(-20) // last 20 trades
    .join("\n");

  return bot.sendMessage(chatId, `📊 Your Trade Logs (last 20):\n\n${tradeLogs}`);

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
