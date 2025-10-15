// models/tradeLog.js
const mongoose = require("mongoose");

const tradeLogSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true },
    side: { type: String, enum: ["BUY", "SELL"], default: "BUY" },
    entryPrice: { type: Number, required: true },
    exitPrice: { type: Number },
    amountUSDT: { type: Number, required: true },
    pnl: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "FAILED"],
      default: "OPEN",
    },
    exposureSnapshot: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        share: Number,
      },
    ],
    closedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TradeLog", tradeLogSchema);
