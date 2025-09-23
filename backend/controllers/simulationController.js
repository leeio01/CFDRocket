// controllers/simulationController.js

const Simulation = require('../models/simulation');
const AuditLog = require('../models/auditLog');
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Initialize Telegram bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
const ADMIN_ID = process.env.ADMIN_CHAT_ID;

// Start Simulation
exports.startSimulation = async (req, res) => {
  if (!['owner', 'supervisor'].includes(req.user.role))
    return res.status(403).json({ message: 'Forbidden' });

  let sim = await Simulation.findOne();
  if (!sim) sim = new Simulation({ isRunning: true });
  else sim.isRunning = true;

  await sim.save();

  await AuditLog.create({
    actorTelegramId: req.user.telegramId,
    action: 'Start Simulation',
    details: 'Simulation started',
  });

  bot.sendMessage(ADMIN_ID, '▶️ Simulation started.');
  res.json({ message: 'Simulation started' });
};

// Pause Simulation
exports.pauseSimulation = async (req, res) => {
  if (!['owner', 'supervisor'].includes(req.user.role))
    return res.status(403).json({ message: 'Forbidden' });

  let sim = await Simulation.findOne();
  if (!sim) return res.status(400).json({ message: 'No simulation found' });

  sim.isRunning = false;
  await sim.save();

  await AuditLog.create({
    actorTelegramId: req.user.telegramId,
    action: 'Pause Simulation',
    details: 'Simulation paused',
  });

  bot.sendMessage(ADMIN_ID, '⏸ Simulation paused.');
  res.json({ message: 'Simulation paused' });
};

// Stop Simulation
exports.stopSimulation = async (req, res) => {
  if (!['owner', 'supervisor'].includes(req.user.role))
    return res.status(403).json({ message: 'Forbidden' });

  let sim = await Simulation.findOne();
  if (!sim) return res.status(400).json({ message: 'No simulation found' });

  sim.isRunning = false;
  sim.balance = 0; // Reset balance for demo stop
  await sim.save();

  await AuditLog.create({
    actorTelegramId: req.user.telegramId,
    action: 'Stop Simulation',
    details: 'Simulation stopped and balance reset',
  });

  bot.sendMessage(ADMIN_ID, '⏹ Simulation stopped and balance reset.');
  res.json({ message: 'Simulation stopped and balance reset' });
};

// Set Growth Rate
exports.setGrowthRate = async (req, res) => {
  if (!['owner', 'supervisor'].includes(req.user.role))
    return res.status(403).json({ message: 'Forbidden' });

  const { rate } = req.body; // Example: 2.83 - 15%
  if (rate < 0 || rate > 100)
    return res.status(400).json({ message: 'Rate must be 0-100%' });

  let sim = await Simulation.findOne();
  if (!sim) sim = new Simulation({ dailyGrowth: rate });
  else sim.dailyGrowth = rate;

  await sim.save();

  await AuditLog.create({
    actorTelegramId: req.user.telegramId,
    action: 'Set Growth Rate',
    details: `Daily growth rate set to ${rate}%`,
  });

  // Notify admin via Telegram
  bot.sendMessage(ADMIN_ID, `📈 Demo growth rate set to ${rate}% per day.`);

  res.json({ success: true, message: `Growth rate updated to ${rate}%` });
};
