// ================== userbot.js ==================
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Binance = require("node-binance-api");
require("dotenv").config();

// ================== ENV Vars ==================
const BOT_TOKEN = process.env.USER_BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;
const BINANCE_TESTNET = process.env.BINANCE_TESTNET === "true";

console.log("🚀 User Bot starting...");
console.log("Token:", BOT_TOKEN ? "Loaded ✅" : "❌ Missing");
console.log("MongoDB:", MONGO_URI ? "Loaded ✅" : "❌ Missing");
console.log("Binance API:", BINANCE_API_KEY ? "Loaded ✅" : "❌ Missing");

// ================== DB Connection ==================
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// ================== DB Model ==================
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
    USDT_ERC20: String,
  },
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

// ================== BINANCE CONNECTION ==================
const binance = new Binance().options({
  APIKEY: BINANCE_API_KEY,
  APISECRET: BINANCE_API_SECRET,
  test: BINANCE_TESTNET, // true = testnet
  family: 4,
  ...(BINANCE_TESTNET && {
    urls: {
      base: "https://testnet.binance.vision", // correct testnet base URL
      stream: "wss://testnet.binance.vision/ws",
    },
  }),
});

binance.useServerTime(); // avoid timestamp errors
console.log(`✅ Binance connected [${BINANCE_TESTNET ? "Testnet" : "Mainnet"}]`);

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

const userKYCState = {};
const userWithdrawState = {};
const userDepositState = {};

// ================== START COMMAND ==================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let user = await User.findOne({ chatId });

  if (!user) {
    user = new User({ chatId });
    await user.save();
  }

  const missingFields = ["name", "phone", "city", "country", "age"].filter((f) => !user[f]);
  if (missingFields.length > 0) {
    userKYCState[chatId] = { step: 0, answers: {} };
    bot.sendMessage(chatId, "👋 Welcome to CFDROCKET Earning Bot!\nPlease complete your KYC.");
    askNextKYC(chatId);
  } else {
    bot.sendMessage(chatId, `👋 Welcome back, ${user.name || "user"}!`);
    showMainMenu(chatId);
  }
});

// ================== KYC FLOW ==================
function askNextKYC(chatId) {
  const state = userKYCState[chatId];
  if (!state) return;

  if (state.step >= kycQuestions.length) {
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

// ================== Helper Promisified Binance Calls ==================
function getBalances() {
  return new Promise((resolve, reject) => {
    binance.balance((err, balances) => {
      if (err) return reject(err);
      resolve(balances);
    });
  });
}

function placeMarketBuy(symbol, quantity) {
  return new Promise((resolve, reject) => {
    binance.marketBuy(symbol, quantity, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function placeMarketSell(symbol, quantity) {
  return new Promise((resolve, reject) => {
    binance.marketSell(symbol, quantity, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function getOpenOrders(symbol = "") {
  return new Promise((resolve, reject) => {
    binance.openOrders(symbol, (err, openOrders) => {
      if (err) return reject(err);
      resolve(openOrders);
    });
  });
}

// ================== MESSAGE HANDLER ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  if (!text) return;

  // If user sends /start via message we ignore because onText handles it
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

  // ===== DEPOSIT PROOF HANDLING =====
  if (userDepositState[chatId]) {
    const state = userDepositState[chatId];
    let proof;
    if (msg.photo) {
      proof = msg.photo[msg.photo.length - 1].file_id;
    } else if (msg.text) {
      proof = msg.text.trim();
    } else {
      return bot.sendMessage(chatId, "❌ Please send screenshot or TXID as proof.");
    }

    user.transactions.push({
      type: "Deposit",
      amount: 0,
      status: "Pending",
      blockchain: state.coin,
      address: state.walletAddr,
      txid: proof,
    });

    await user.save();
    delete userDepositState[chatId];

    bot.sendMessage(chatId, "✅ Deposit proof received! Pending admin review.");
    return showMainMenu(chatId);
  }

  // ===== WITHDRAW FLOW =====
  if (userWithdrawState[chatId]) {
    const state = userWithdrawState[chatId];
    switch (state.step) {
      case 0:
        if (text.toLowerCase() === "exit") {
          delete userWithdrawState[chatId];
          return bot.sendMessage(chatId, "❌ Withdrawal canceled. Returning to main menu.");
        }

        const amount = Number(text);
        if (isNaN(amount) || amount <= 0)
          return bot.sendMessage(chatId, "❌ Invalid amount. Enter again or type 'Exit' to cancel:");
        if (amount > user.balance)
          return bot.sendMessage(chatId, "❌ Insufficient balance. Enter again or type 'Exit' to cancel:");
        state.amount = amount;
        state.step++;
        return bot.sendMessage(chatId, "Enter your deposit address (or type 'Exit' to cancel):");

      case 1:
        state.address = text.trim();
        state.step++;
        return bot.sendMessage(chatId, "Confirm your deposit address again:");

      case 2:
        if (state.address !== text.trim()) {
          state.step = 1;
          return bot.sendMessage(chatId, "❌ Addresses do not match. Enter again:");
        }
        state.step++;
        return bot.sendMessage(chatId, "Enter blockchain (USDT-BEP / USDT-ERC20 / BTC / ETH / SOL):");

      case 3:
        const chain = text.trim().toUpperCase();
        const allowed = ["USDT-BEP", "USDT-ERC20", "BTC", "ETH", "SOL"];
        if (!allowed.includes(chain)) return bot.sendMessage(chatId, "❌ Invalid blockchain. Enter again:");
        state.blockchain = chain;

        user.transactions.push({
          type: "Withdraw",
          amount: state.amount,
          status: "Pending",
          address: state.address,
          blockchain: state.blockchain,
        });
        user.balance -= state.amount;
        await user.save();

        delete userWithdrawState[chatId];
        bot.sendMessage(
          chatId,
          `💸 Withdrawal requested!\nAmount: ${state.amount}\nBlockchain: ${state.blockchain}\nPending admin approval.`
        );

        return showMainMenu(chatId);
    }
    return;
  }

  // ===== MENU ACTIONS & Quick Commands (text matching) =====
  // Support quick-runtime commands like /buy, /sell, /balance, /openorders
  if (text.toLowerCase().startsWith("/buy") || text.toLowerCase().startsWith("/sell")) {
    // handled by onText below; ignore here
    return;
  }

  switch (text) {
    case "💰 Deposit Wallets":
      if (!user.wallets?.BTC) {
        user.wallets = { BTC: "btc_" + chatId, USDT_ERC20: "usdt_erc20_" + chatId };
        await user.save();
      }

      const depositOptions = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💎 BTC", callback_data: "deposit_BTC" }],
            [{ text: "💰 USDT-ERC20", callback_data: "deposit_USDT_ERC20" }],
            [{ text: "⬅️ Back to Menu", callback_data: "back_main" }],
          ],
        },
      };

      return bot.sendMessage(chatId, "Select a deposit option 👇", depositOptions);

    case "📈 My Balance":
      return bot.sendMessage(chatId, `📈 Balance: ${user.balance} USDT`);

    case "📜 Transactions":
      if (!user.transactions.length) return bot.sendMessage(chatId, "No transactions yet.");
      let txReply = "📜 Transactions:\n\n";
      user.transactions.forEach((tx) => {
        const statusText =
          tx.status === "Pending"
            ? "⏳ Pending"
            : tx.status === "Completed"
            ? "✅ Completed"
            : tx.status;
        txReply += `${tx.type} - ${tx.amount} USDT - ${statusText} (${tx.date.toLocaleString()})\n`;
      });
      return bot.sendMessage(chatId, txReply);

    case "💸 Withdraw":
      userWithdrawState[chatId] = { step: 0 };
      return bot.sendMessage(chatId, "Enter amount to withdraw:");

    case "📊 Trades":
      // Testnet doesn't provide market prices — show mock prices and emphasize testnet trading works
      try {
        let prices = {};
        try {
          prices = await binance.prices(); // may fail on testnet for public data
        } catch (e) {
          // testnet public endpoints often don't have price data — fallback to mock prices
          prices = {
            BTCUSDT: "65000.00",
            ETHUSDT: "2500.00",
            BNBUSDT: "300.00",
            SOLUSDT: "120.00",
            XRPUSDT: "0.60",
            ADAUSDT: "0.45",
            DOGEUSDT: "0.12",
            DOTUSDT: "6.50",
            MATICUSDT: "0.80",
            LINKUSDT: "15.00",
          };
        }

        const usdtPairs = Object.keys(prices)
          .filter((s) => s.endsWith("USDT"))
          .slice(0, 10)
          .map((s) => `${s}: ${prices[s]} USDT`)
          .join("\n");

        return bot.sendMessage(
          chatId,
          `📊 *Mock/Available Market Prices (Testnet)*:\n\n${usdtPairs}\n\nUse /buy SYMBOL QTY or /sell SYMBOL QTY to place market orders on Testnet.`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("❌ Binance Error (Trades):", err);
        return bot.sendMessage(chatId, "⚠️ Unable to fetch market data. Testnet trading is still supported.");
      }

    case "📞 Support":
      return bot.sendMessage(chatId, "📞 Contact support: @cfdrocket_support");

    default:
      return showMainMenu(chatId);
  }
});

// ================== COMMAND: /balance (shows testnet balances) ==================
bot.onText(/^\/balance$/i, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const balances = await getBalances();
    // show only non-zero balances
    const nonZero = Object.entries(balances)
      .filter(([sym, val]) => Number(val.available) > 0 || Number(val.onOrder) > 0)
      .map(([sym, val]) => `${sym} — free: ${val.available} | onOrder: ${val.onOrder}`)
      .join("\n");

    const reply = nonZero || "No balances (or all zero).";
    return bot.sendMessage(chatId, `📊 Testnet Balances:\n\n${reply}`);
  } catch (err) {
    console.error("❌ /balance error:", err);
    return bot.sendMessage(chatId, "⚠️ Unable to fetch balances. Make sure your Testnet API key is correct.");
  }
});

// ================== COMMAND: /openorders (show open orders) ==================
bot.onText(/^\/openorders(?:\s+(\S+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = (match && match[1]) ? match[1].toUpperCase() : ""; // optional
  try {
    const open = await getOpenOrders(symbol);
    if (!open || !open.length) return bot.sendMessage(chatId, "No open orders.");
    const list = open.map(o => `${o.symbol} ${o.side} ${o.origQty} @ ${o.price || "market"} (id:${o.orderId})`).join("\n");
    return bot.sendMessage(chatId, `📋 Open Orders:\n\n${list}`);
  } catch (err) {
    console.error("❌ /openorders error:", err);
    return bot.sendMessage(chatId, "⚠️ Unable to fetch open orders. Check API key permissions.");
  }
});

// ================== COMMANDS: /buy and /sell (market orders on testnet) ==================
bot.onText(/^\/buy\s+([A-Za-z0-9]+)\s+([0-9]*\.?[0-9]+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match[1].toUpperCase();
  const qty = match[2];
  try {
    await bot.sendMessage(chatId, `Placing market BUY order: ${symbol} quantity ${qty} (testnet) ...`);
    const res = await placeMarketBuy(symbol, qty);
    await bot.sendMessage(chatId, `✅ Buy order placed (Testnet):\n${JSON.stringify(res)}`);
  } catch (err) {
    console.error("❌ /buy error:", err);
    const errMsg = (err && err.body) ? err.body : (err && err.message) ? err.message : String(err);
    return bot.sendMessage(chatId, `⚠️ Buy failed: ${errMsg}`);
  }
});

bot.onText(/^\/sell\s+([A-Za-z0-9]+)\s+([0-9]*\.?[0-9]+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match[1].toUpperCase();
  const qty = match[2];
  try {
    await bot.sendMessage(chatId, `Placing market SELL order: ${symbol} quantity ${qty} (testnet) ...`);
    const res = await placeMarketSell(symbol, qty);
    await bot.sendMessage(chatId, `✅ Sell order placed (Testnet):\n${JSON.stringify(res)}`);
  } catch (err) {
    console.error("❌ /sell error:", err);
    const errMsg = (err && err.body) ? err.body : (err && err.message) ? err.message : String(err);
    return bot.sendMessage(chatId, `⚠️ Sell failed: ${errMsg}`);
  }
});

// ================== INLINE BUTTON HANDLER ==================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const user = await User.findOne({ chatId });

  if (!user) return bot.sendMessage(chatId, "❌ Please run /start first.");

  if (data.startsWith("deposit_")) {
    const coin = data.split("_")[1];
    const walletAddr = user.wallets[coin] || `${coin.toLowerCase()}_${chatId}`;

    bot.sendMessage(
      chatId,
      `💳 *${coin} Deposit Address:*\n\`${walletAddr}\`\n\n📎 Please send your deposit and upload proof (screenshot or TXID).`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 Copy Address", callback_data: "copy_" + walletAddr }],
            [{ text: "⬅️ Back to Menu", callback_data: "back_main" }],
          ],
        },
      }
    );

    userDepositState[chatId] = { coin, walletAddr };
    return;
  }

  if (data.startsWith("copy_")) {
    bot.answerCallbackQuery(query.id, { text: "✅ Address copied (simulated)" });
    return;
  }

  if (data === "back_main") {
    showMainMenu(chatId);
    return;
  }
});

// ================== MAIN MENU ==================
function showMainMenu(chatId) {
  const keyboard = [
    ["💰 Deposit Wallets", "📈 My Balance"],
    ["📜 Transactions", "💸 Withdraw"],
    ["📊 Trades", "📞 Support"],
  ];
  bot.sendMessage(chatId, "📍 Main Menu", {
    reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: false },
  });
}
