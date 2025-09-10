const Simulation = require('../models/Simulation');
const Balance = require('../models/Balance');

exports.startSimulation = async (req, res) => {
  try {
    const userId = req.userId;
    const { asset = 'USDT', startAmount = 1000 } = req.body;
    // if existing active sim, return it
    let sim = await Simulation.findOne({ userId, asset, active: true });
    if (sim) return res.json(sim);
    sim = await Simulation.create({
      userId,
      asset,
      startBalance: startAmount,
      currentBalance: startAmount,
      active: true,
      history: []
    });
    // mirror to balances
    await Balance.updateOne({ userId, asset }, { userId, asset, amount: startAmount, isDemo: true }, { upsert: true });
    res.json(sim);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
};

exports.stopSimulation = async (req, res) => {
  try {
    const userId = req.userId;
    const { asset = 'USDT' } = req.body;
    await Simulation.updateMany({ userId, asset, active: true }, { $set: { active: false } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
};

exports.listSimulations = async (req, res) => {
  const sims = await Simulation.find({ userId: req.userId });
  res.json(sims);
};
