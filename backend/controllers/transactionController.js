// controllers/transactionController.js

const Transaction = require('../models/transaction');
const AuditLog = require('../models/auditLog');
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Initialize Telegram bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
const adminId = process.env.ADMIN_CHAT_ID;

// Demo Deposit
exports.demoDeposit = async (req, res) => {
  try {
    const { walletId, amount } = req.body;

    // Create transaction
    const tx = await Transaction.create({
      walletId,
      type: 'deposit',
      amount,
      status: 'processed',
      requestedByTelegramId: req.user.telegramId,
    });

    // Log audit
    await AuditLog.create({
      actorTelegramId: req.user.telegramId,
      action: 'Demo Deposit',
      details: `${amount} to ${walletId}`,
    });

    // Send Telegram notification to admin
    bot.sendMessage(
      adminId,
      `💰 Demo Deposit Alert:
User: ${req.user.telegramId}
Amount: ${amount} (Wallet: ${walletId})`
    );

    res.json({ message: 'Demo deposit processed', transaction: tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing demo deposit', error: err.message });
  }
};

// Demo Withdrawal
exports.demoWithdraw = async (req, res) => {
  try {
    const { walletId, amount } = req.body;

    // Create transaction
    const tx = await Transaction.create({
      walletId,
      type: 'withdrawal',
      amount,
      status: 'pending',
      requestedByTelegramId: req.user.telegramId,
    });

    // Log audit
    await AuditLog.create({
      actorTelegramId: req.user.telegramId,
      action: 'Demo Withdraw',
      details: `${amount} from ${walletId}`,
    });

    // Send Telegram notification to admin
    bot.sendMessage(
      adminId,
      `⚠️ Demo Withdrawal Alert:
User: ${req.user.telegramId}
Amount: ${amount} (Wallet: ${walletId})
Status: Processing (Demo Mode)`
    );

    res.json({ message: 'Demo withdrawal requested (demo only)', transaction: tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing demo withdrawal', error: err.message });
  }
};
