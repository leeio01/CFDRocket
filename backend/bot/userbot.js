const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Binance = require("node-binance-api");
require("dotenv").config();

const BOT_TOKEN = process.env.USER_BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;
const BINANCE_TESTNET = process.env.BINANCE_TESTNET === "true";

// ------------------- MongoDB Setup -------------------
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB Error:", err.message));

const userSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true }, // optional, allows multiple nulls
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

// ------------------- Binance Setup -------------------
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

function getBalances() {
  return new Promise((res, rej) =>
    binance.balance((e, b) => (e ? rej(e) : res(b)))
  );
}
function placeMarketBuy(symbol, qty) {
  return new Promise((res, rej) =>
    binance.marketBuy(symbol, qty, (e, r) => (e ? rej(e) : res(r)))
  );
}
function placeMarketSell(symbol, qty) {
  return new Promise((res, rej) =>
    binance.marketSell(symbol, qty, (e, r) => (e ? rej(e) : res(r)))
  );
}
function getOpenOrders(symbol = "") {
  return new Promise((res, rej) =>
    binance.openOrders(symbol, (e, o) => (e ? rej(e) : res(o)))
  );
}

// ------------------- Telegram Bot -------------------
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const kycQuestions = [
  {
    key: "name",
    question: "Enter your Full Name (First & Last):",
    validate: (txt) => txt.trim().split(" ").length >= 2,
  },
  {
    key: "phone",
    question: "Enter your Phone Number (+123456789):",
    validate: (txt) => /^\+?\d{5,15}$/.test(txt),
  },
  {
    key: "city",
    question: "Enter your City:",
    validate: (txt) => txt.trim().length > 0,
  },
  {
    key: "country",
    question: "Enter your Country:",
    validate: (txt) => txt.trim().length > 0,
  },
  {
    key: "age",
    question: "Enter your Age:",
    validate: (txt) => /^\d{1,3}$/.test(txt),
  },
];

const userKYCState = {};
const userWithdrawState = {};
const userDepositState = {};

// ------------------- /start Command -------------------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  let user;
  try {
    user = await User.findOne({ chatId });
    if (!user) {
      // upsert ensures no duplicate chatId
      user = await User.findOneAndUpdate(
        { chatId },
        { chatId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      // Optional default email to prevent unique errors
      user.email = user.email || `user_${chatId}@example.com`;
      await user.save();
    }
  } catch (err) {
    console.error("MongoDB insert error:", err.message);
    return bot.sendMessage(chatId, "An error occurred. Try /start again.");
  }

  const missingFields = ["name", "phone", "city", "country", "age"].filter(
    (f) => !user[f]
  );
  if (missingFields.length > 0) {
    userKYCState[chatId] = { step: 0, answers: {} };
    bot.sendMessage(chatId, "Welcome! Please complete your KYC.");
    askNextKYC(chatId);
  } else {
    bot.sendMessage(chatId, `Welcome back, ${user.name || "user"}!`);
    showMainMenu(chatId);
  }
});

// ------------------- KYC Flow -------------------
function askNextKYC(chatId) {
  const state = userKYCState[chatId];
  if (!state) return;

  if (state.step >= kycQuestions.length) {
    User.findOneAndUpdate(
      { chatId },
      { $set: state.answers },
      { new: true }
    )
      .then(() => {
        bot.sendMessage(
          chatId,
          `KYC Completed! Welcome, ${state.answers.name}.`
        );
        delete userKYCState[chatId];
        showMainMenu(chatId);
      })
      .catch((err) => {
        console.error("KYC Save Error:", err.message);
        bot.sendMessage(chatId, "Error saving KYC. Try /start again.");
      });
    return;
  }

  const q = kycQuestions[state.step];
  bot.sendMessage(chatId, q.question);
}

// ------------------- Message Handler -------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text || text.startsWith("/start")) return;

  let user = await User.findOne({ chatId });
  if (!user) return bot.sendMessage(chatId, "Please run /start first.");

  // KYC Flow
  if (userKYCState[chatId]) {
    const state = userKYCState[chatId];
    const q = kycQuestions[state.step];
    if (!q.validate(text))
      return bot.sendMessage(chatId, `Invalid input. ${q.question}`);
    state.answers[q.key] = text.trim();
    state.step++;
    return askNextKYC(chatId);
  }

  // Deposit Proof
  if (userDepositState[chatId]) {
    const state = userDepositState[chatId];
    let proof = msg.photo ? msg.photo[msg.photo.length - 1].file_id : text;
    if (!proof)
      return bot.sendMessage(chatId, "Send screenshot or TXID as proof.");
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
    return bot.sendMessage(
      chatId,
      "Deposit proof received! Pending admin review.",
      showMainMenu(chatId)
    );
  }

  // Withdraw Flow
  if (userWithdrawState[chatId]) {
    const state = userWithdrawState[chatId];
    switch (state.step) {
      case 0:
        if (text.toLowerCase() === "exit") {
          delete userWithdrawState[chatId];
          return bot.sendMessage(chatId, "Withdrawal canceled.");
        }
        const amt = Number(text);
        if (isNaN(amt) || amt <= 0)
          return bot.sendMessage(chatId, "Invalid amount. Enter again or type 'Exit'");
        if (amt > user.balance)
          return bot.sendMessage(chatId, "Insufficient balance. Enter again or type 'Exit'");
        state.amount = amt;
        state.step++;
        return bot.sendMessage(chatId, "Enter your deposit address:");
      case 1:
        state.address = text.trim();
        state.step++;
        return bot.sendMessage(chatId, "Confirm your deposit address again:");
      case 2:
        if (state.address !== text.trim()) {
          state.step = 1;
          return bot.sendMessage(chatId, "Addresses do not match. Enter again:");
        }
        state.step++;
        return bot.sendMessage(
          chatId,
          "Enter blockchain (USDT-BEP / USDT-ERC20 / BTC / ETH / SOL):"
        );
      case 3:
        const chain = text.trim().toUpperCase();
        if (!["USDT-BEP", "USDT-ERC20", "BTC", "ETH", "SOL"].includes(chain))
          return bot.sendMessage(chatId, "Invalid blockchain. Enter again:");
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
          `Withdrawal requested!\nAmount: ${state.amount}\nBlockchain: ${state.blockchain}\nPending admin approval.`
        );
        return showMainMenu(chatId);
    }
  }

  // Menu Commands
  switch (text) {
    case "💰 Deposit Wallets":
      if (!user.wallets?.BTC) {
        user.wallets = { BTC: "btc_" + chatId, USDT_ERC20: "usdt_erc20_" + chatId };
        await user.save();
      }
      return bot.sendMessage(chatId, "Select a deposit option:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💎 BTC", callback_data: "deposit_BTC" }],
            [{ text: "💰 USDT-ERC20", callback_data: "deposit_USDT_ERC20" }],
            [{ text: "⬅️ Back to Menu", callback_data: "back_main" }],
          ],
        },
      });
    case "📈 My Balance":
      return bot.sendMessage(chatId, `Balance: ${user.balance} USDT`);
    case "📜 Transactions":
      if (!user.transactions.length) return bot.sendMessage(chatId, "No transactions yet.");
      let txReply = "Transactions:\n\n";
      user.transactions.forEach((tx) => {
        const s =
          tx.status === "Pending"
            ? "Pending"
            : tx.status === "Completed"
            ? "Completed"
            : tx.status;
        txReply += `${tx.type} - ${tx.amount} USDT - ${s} (${tx.date.toLocaleString()})\n`;
      });
      return bot.sendMessage(chatId, txReply);
    case "💸 Withdraw":
      userWithdrawState[chatId] = { step: 0 };
      return bot.sendMessage(chatId, "Enter amount to withdraw:");
    case "📊 Trades":
      let prices = {};
      try {
        prices = await binance.prices();
      } catch (e) {
        prices = { BTCUSDT: "65000", ETHUSDT: "2500", BNBUSDT: "300", SOLUSDT: "120" };
      }
      const usdtPairs = Object.keys(prices)
        .filter((s) => s.endsWith("USDT"))
        .slice(0, 10)
        .map((s) => `${s}: ${prices[s]} USDT`)
        .join("\n");
      return bot.sendMessage(
        chatId,
        `Market Prices:\n${usdtPairs}\nUse /buy SYMBOL QTY or /sell SYMBOL QTY to place orders.`,
        { parse_mode: "Markdown" }
      );
    case "📞 Support":
      return bot.sendMessage(chatId, "Contact support: @cfdrocket_support");
    default:
      showMainMenu(chatId);
  }
});

// ------------------- Inline Callbacks -------------------
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const user = await User.findOne({ chatId });
  if (!user) return bot.sendMessage(chatId, "Please run /start first.");

  if (data.startsWith("deposit_")) {
    const coin = data.split("_")[1];
    const walletAddr = user.wallets[coin] || `${coin.toLowerCase()}_${chatId}`;
    bot.sendMessage(
      chatId,
      `${coin} Deposit Address:\n${walletAddr}\nUpload proof (screenshot/TXID).`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Copy Address", callback_data: "copy_" + walletAddr }],
            [{ text: "Back to Menu", callback_data: "back_main" }],
          ],
        },
      }
    );
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

// ------------------- Main Menu -------------------
function showMainMenu(chatId) {
  const keyboard = [
    ["💰 Deposit Wallets", "📈 My Balance"],
    ["📜 Transactions", "💸 Withdraw"],
    ["📊 Trades", "📞 Support"],
  ];
  bot.sendMessage(chatId, "Main Menu", {
    reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: false },
  });
}

// ------------------- Additional Commands -------------------
bot.onText(/^\/balance$/i, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const balances = await getBalances();
    const nonZero = Object.entries(balances)
      .filter(([sym, val]) => Number(val.available) > 0 || Number(val.onOrder) > 0)
      .map(([sym, val]) => `${sym} — free: ${val.available} | onOrder: ${val.onOrder}`)
      .join("\n");
    return bot.sendMessage(chatId, `Balances:\n${nonZero || "No balances or all zero."}`);
  } catch (err) {
    return bot.sendMessage(chatId, "Unable to fetch balances. Check API keys.");
  }
});

bot.onText(/^\/openorders(?:\s+(\S+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match && match[1] ? match[1].toUpperCase() : "";
  try {
    const open = await getOpenOrders(symbol);
    if (!open || !open.length) return bot.sendMessage(chatId, "No open orders.");
    const list = open
      .map((o) => `${o.symbol} ${o.side} ${o.origQty} @ ${o.price || "market"} (id:${o.orderId})`)
      .join("\n");
    return bot.sendMessage(chatId, `Open Orders:\n${list}`);
  } catch (err) {
    return bot.sendMessage(chatId, "Unable to fetch open orders. Check API key permissions.");
  }
});

bot.onText(/^\/buy\s+([A-Za-z0-9]+)\s+([0-9]*\.?[0-9]+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match[1].toUpperCase();
  const qty = match[2];
  try {
    await bot.sendMessage(chatId, `Placing BUY order: ${symbol} qty ${qty}...`);
    const res = await placeMarketBuy(symbol, qty);
    await bot.sendMessage(chatId, `Buy order placed:\n${JSON.stringify(res)}`);
  } catch (err) {
    const errMsg = (err && err.body) ? err.body : (err && err.message) ? err.message : String(err);
    return bot.sendMessage(chatId, `Buy failed: ${errMsg}`);
  }
});

bot.onText(/^\/sell\s+([A-Za-z0-9]+)\s+([0-9]*\.?[0-9]+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match[1].toUpperCase();
  const qty = match[2];
  try {
    await bot.sendMessage(chatId, `Placing SELL order: ${symbol} qty ${qty}...`);
    const res = await placeMarketSell(symbol, qty);
    await bot.sendMessage(chatId, `Sell order placed:\n${JSON.stringify(res)}`);
  } catch (err) {
    const errMsg = (err && err.body) ? err.body : (err && err.message) ? err.message : String(err);
    return bot.sendMessage(chatId, `Sell failed: ${errMsg}`);
  }
});
