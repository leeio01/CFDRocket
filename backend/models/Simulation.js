const mongoose = require('mongoose');

const SimulationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  asset: { type: String, required: true },
  walletLabel: { type: String, default: 'demo-wallet' },
  startBalance: { type: Number, required: true },
  currentBalance: { type: Number, required: true },
  active: { type: Boolean, default: true },
  history: [{ date: Date, percent: Number, change: Number }]
}, { timestamps: true });

module.exports = mongoose.model('Simulation', SimulationSchema);
