const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currency: { type: String, required: true }, // BTC, ETH, USDT, etc.
  depositAddress: { type: String, required: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', walletSchema);
