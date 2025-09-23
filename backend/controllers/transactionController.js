const Transaction = require('../models/transaction');
const AuditLog = require('../models/auditLog');

exports.demoDeposit = async (req, res) => {
  const { walletId, amount } = req.body;
  const tx = await Transaction.create({
    walletId,
    type: 'deposit',
    amount,
    status: 'processed',
    requestedByTelegramId: req.user.telegramId
  });
  await AuditLog.create({ actorTelegramId: req.user.telegramId, action: 'Demo Deposit', details: `${amount} to ${walletId}` });
  res.json({ message: 'Demo deposit processed', transaction: tx });
};

exports.demoWithdraw = async (req, res) => {
  const { walletId, amount } = req.body;
  const tx = await Transaction.create({
    walletId,
    type: 'withdrawal',
    amount,
    status: 'pending',
    requestedByTelegramId: req.user.telegramId
  });
  await AuditLog.create({ actorTelegramId: req.user.telegramId, action: 'Demo Withdraw', details: `${amount} from ${walletId}` });
  res.json({ message: 'Demo withdrawal requested (demo only)', transaction: tx });
};
