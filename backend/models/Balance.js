const mongoose = require('mongoose');

const BalanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  asset: { type: String, required: true }, // e.g., USDT, BTC
  amount: { type: Number, default: 0 },
  isDemo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Balance', BalanceSchema);
