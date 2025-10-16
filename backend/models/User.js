const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: String,
  phone: String,
  country: String,
  city: String,
  age: String,
  balance: { type: Number, default: 0 },
  invested: { type: Number, default: 0 },
  wallets: {
    type: Object,
    default: {},
  },
  transactions: {
    type: Array,
    default: [],
  },
}, { timestamps: true });

// 3rd argument ensures it connects to your "users" collection
module.exports = mongoose.model("User", userSchema, "users");
