const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currency: { type: String, required: true }, // BTC, ETH, USDT, etc.
  depositAddress: { type: String, required: true },
  notes: { type: String },
  totalBalance: { type: Number, default: 0 }, // total wallet amount the bot can trade
  profit: { type: Number, default: 0 },       // total profit earned by bot
  loss: { type: Number, default: 0 },         // total loss recorded by bot
  isTrading: { type: Boolean, default: false }, // prevents double trading
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', walletSchema);
