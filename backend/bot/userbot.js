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
  urls: BINANCE_TESTNET
    ? { base: "https://testnet.binance.vision/api/" } // use testnet API
    : undefined,
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
    bot.sendMessage(chatId, `👋 Welcome back, ${user.name}!`);
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

  // ===== MENU ACTIONS =====
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

    // ====== BINANCE TRADES ======
    case "📊 Trades":
      try {
        const prices = await binance.prices();
        const usdtPairs = Object.keys(prices)
          .filter((s) => s.endsWith("USDT"))
          .slice(0, 10)
          .map((s) => `${s}: ${prices[s]} USDT`)
          .join("\n");

        return bot.sendMessage(chatId, `📊 *Market Prices (Top 10 USDT pairs)*:\n\n${usdtPairs}`, {
          parse_mode: "Markdown",
        });
      } catch (err) {
        console.error("❌ Binance Error:", err.message);
        return bot.sendMessage(
          chatId,
          "⚠️ Unable to fetch market data. Please ensure your Binance Testnet key is valid."
        );
      }

    case "📞 Support":
      return bot.sendMessage(chatId, "📞 Contact support: @cfdrocket_support");

    default:
      return;
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
