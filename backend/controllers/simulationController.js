const Simulation = require('../models/simulation');
const AuditLog = require('../models/auditLog');

exports.startSimulation = async (req, res) => {
  if (!['owner','supervisor'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });

  await Simulation.updateMany({}, { isActive: true });
  await AuditLog.create({ actorTelegramId: req.user.telegramId, action: 'Start Simulation', details: 'All wallets' });
  res.json({ message: 'Simulation started' });
};

exports.pauseSimulation = async (req, res) => {
  if (!['owner','supervisor'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });

  await Simulation.updateMany({}, { isActive: false });
  await AuditLog.create({ actorTelegramId: req.user.telegramId, action: 'Pause Simulation', details: 'All wallets' });
  res.json({ message: 'Simulation paused' });
};

exports.setGrowthRate = async (req, res) => {
  if (!['owner','supervisor'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });

  const { walletId, growthRate } = req.body;
  await Simulation.findByIdAndUpdate(walletId, { growthRate });
  await AuditLog.create({ actorTelegramId: req.user.telegramId, action: 'Set Growth Rate', details: `${walletId} -> ${growthRate}` });
  res.json({ message: 'Growth rate updated' });
};
