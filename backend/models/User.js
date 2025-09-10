const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: String },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  telegramId: { type: String },
  role: { type: String, enum: ['user','admin'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
