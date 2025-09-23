const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorTelegramId: String,
  action: String,
  details: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
