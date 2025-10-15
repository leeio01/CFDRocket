/**
 * Trading Bot (worker) - beginner-safe implementation
 * - Uses one shared wallet (Wallet collection)
 * - Scans top N USDT pairs
 * - Opens trades with TP = +10%, SL = -2%
 * - Tracks user exposure and distributes PnL
 * - Includes safety checks & DRY_RUN mode
 */

const Binance = require("node-binance-api");
const mongoose = require("mongoose");
require("dotenv").config();

// ✅ Correct paths (important!)
const User = require("../models/User");
const Wallet = require("../models/wallet");
const TradeLog = require("../models/tradeLog");

// === ENVIRONMENT CONFIG ===
const {
  MONGO_URI,
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_TESTNET = "true",
  DRY_RUN = "true",
  TRADE_INTERVAL_MINUTES = "60",
  TOP_N = "100",
  ALLOCATION_PERCENT_PER_TRADE = "0.01",
  MAX_CONCURRENT_TRADES = "10"
} = process.env;

// === CONSTANTS ===
const dryRun = DRY_RUN === "true";
const testnet = BINANCE_TESTNET === "true";
const tradeIntervalMs = Math.max(1, Number(TRADE_INTERVAL_MINUTES)) * 60 * 1000;
const topN = Math.max(1, Number(TOP_N));
const allocationPercent = Number(ALLOCATION_PERCENT_PER_TRADE);
const maxConcurrent = Math.max(1, Number(MAX_CONCURRENT_TRADES));

// === DATABASE CONNECTION ===
if (!MONGO_URI) throw new Error("❌ MONGO_URI missing in .env");

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// === BINANCE CONFIG ===
const binance = new Binance().options({
  APIKEY: BINANCE_API_KEY || "",
  APISECRET: BINANCE_API_SECRET || "",
  test: testnet,
  ...(testnet && {
    urls: {
      base: "https://testnet.binance.vision",
      stream: "wss://testnet.binance.vision/ws"
    }
  })
});

// === LOCK SYSTEM ===
async function acquireTradeLock(walletId) {
  return await Wallet.findOneAndUpdate(
    { _id: walletId, isTrading: { $ne: true } },
    { $set: { isTrading: true } },
    { new: true }
  );
}

async function releaseTradeLock(walletId) {
  await Wallet.findByIdAndUpdate(walletId, { $set: { isTrading: false } });
}

// === FETCH MARKET DATA ===
async function fetchTopPairs() {
  try {
    const prices = await binance.prices();
    const pairs = Object.keys(prices)
      .filter((p) => p.endsWith("USDT"))
      .slice(0, topN);
    return { prices, pairs };
  } catch (err) {
    console.warn("⚠️ Binance prices error:", err.message || err);
    return { prices: {}, pairs: [] };
  }
}

// === CREATE USER SNAPSHOT ===
async function createExposureSnapshot(requestedUSDT) {
  const users = await User.find({ balance: { $gt: 0 } }).select("_id balance");
  const total = users.reduce((s, u) => s + (u.balance || 0), 0);
  if (total <= 0) return { snapshot: [], totalCollected: 0 };

  let accumulated = 0;
  const snapshot = [];

  for (const user of users) {
    if (accumulated >= requestedUSDT) break;
    const proportional = (user.balance / total) * requestedUSDT;
    const share = Math.min(Number(proportional.toFixed(2)), requestedUSDT - accumulated);
    if (share <= 0) continue;

    await User.findByIdAndUpdate(user._id, {
      $inc: { balance: -share, invested: share }
    });

    snapshot.push({ userId: user._id, share });
    accumulated += share;
  }

  return { snapshot, totalCollected: accumulated };
}

// === DISTRIBUTE PNL ===
async function distributePnL(snapshot, totalPnL) {
  if (!snapshot?.length) return;

  const totalSnapshot = snapshot.reduce((s, x) => s + x.share, 0);
  if (totalSnapshot <= 0) return;

  for (const item of snapshot) {
    const proportion = item.share / totalSnapshot;
    const userPnL = Number((totalPnL * proportion).toFixed(8));
    const principal = item.share;

    await User.findByIdAndUpdate(item.userId, {
      $inc: { balance: principal + userPnL, invested: -principal },
      $push: {
        transactions: {
          type: "P&L",
          amount: Number((principal + userPnL).toFixed(8)),
          status: "Completed",
          date: new Date(),
          note: `PnL ${userPnL.toFixed(8)} for trade`
        }
      }
    });
  }
}

// === PNL CALC ===
function computePnl(amountUSDT, entryPrice, exitPrice, side = "BUY") {
  const priceChange = (exitPrice - entryPrice) / entryPrice;
  const pnl = side === "BUY" ? priceChange * amountUSDT : -priceChange * amountUSDT;
  return Number(pnl.toFixed(8));
}

// === MAIN TRADE CYCLE ===
async function tradeCycle() {
  console.log("\n⏱ Starting trade cycle:", new Date().toISOString());

  const wallet = await Wallet.findOne();
  if (!wallet) return console.warn("⚠️ No wallet found. Create one in DB first.");

  const locked = await acquireTradeLock(wallet._id);
  if (!locked) return console.log("🔒 Another cycle is running. Skipping.");

  try {
    if (wallet.totalBalance <= 0) {
      console.log("💰 Wallet balance is zero — nothing to trade.");
      return;
    }

    const { prices, pairs } = await fetchTopPairs();
    if (!pairs.length) return console.log("⚠️ No pairs fetched.");

    const toProcess = Math.min(maxConcurrent, pairs.length);
    let opened = 0;

    for (let i = 0; i < toProcess; i++) {
      const symbol = pairs[i];
      const entryPrice = Number(prices[symbol]);
      if (!entryPrice) continue;

      const allocationUSDT = Number((wallet.totalBalance * allocationPercent).toFixed(2));
      if (allocationUSDT < 1) {
        console.log("Allocation < 1 USDT, skipping trade.");
        break;
      }

      const { snapshot, totalCollected } = await createExposureSnapshot(allocationUSDT);
      if (!snapshot.length || totalCollected <= 0) continue;

      const trade = new TradeLog({
        symbol,
        side: "BUY",
        entryPrice,
        amountUSDT: totalCollected,
        status: "OPEN",
        exposureSnapshot: snapshot
      });
      await trade.save();

      if (dryRun) console.log(`[DRY] Simulated BUY ${symbol} ${totalCollected} USDT @ ${entryPrice}`);
      else {
        try {
          await binance.marketBuy(symbol, (totalCollected / entryPrice).toFixed(8));
          console.log(`✅ Real BUY ${symbol} ${totalCollected} USDT`);
        } catch (err) {
          console.error("Buy failed:", err.message);
          await distributePnL(snapshot, -totalCollected);
          trade.status = "FAILED";
          trade.notes = `Buy failed: ${err.message}`;
          await trade.save();
          continue;
        }
      }

      // Simulate trade exit (TP/SL)
      const rand = Math.random();
      const simulatedExitPrice = rand < 0.5
        ? entryPrice * 1.10 // +10% TP
        : entryPrice * 0.98; // -2% SL

      const pnl = computePnl(totalCollected, entryPrice, simulatedExitPrice, "BUY");
      trade.exitPrice = simulatedExitPrice;
      trade.pnl = pnl;
      trade.status = "CLOSED";
      trade.closedAt = new Date();
      await trade.save();

      wallet.totalBalance = Number((wallet.totalBalance + pnl).toFixed(8));
      if (pnl > 0) wallet.profit = (wallet.profit || 0) + pnl;
      else wallet.loss = (wallet.loss || 0) + Math.abs(pnl);
      await wallet.save();

      await distributePnL(snapshot, pnl);
      console.log(`📈 ${symbol} closed: entry ${entryPrice}, exit ${simulatedExitPrice}, pnl ${pnl.toFixed(4)} USDT`);
      opened++;
    }

    console.log(`✅ Cycle complete. Opened ${opened} trades.`);
  } catch (err) {
    console.error("❌ Trade cycle error:", err.message);
  } finally {
    await releaseTradeLock(wallet._id);
  }
}

// === BOT RUNNER ===
(async () => {
  console.log("🤖 Trading bot starting... DRY_RUN =", dryRun, "TESTNET =", testnet);
  await tradeCycle();
  setInterval(tradeCycle, tradeIntervalMs);
})();
