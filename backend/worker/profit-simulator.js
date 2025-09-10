require('dotenv').config();
const connectDB = require('../config/db');
const Simulation = require('../models/Simulation');
const Balance = require('../models/Balance');

async function runOnce() {
  await connectDB();
  const sims = await Simulation.find({ active: true });
  console.log('Active simulations:', sims.length);
  for (const sim of sims) {
    const min = 4, max = 15;
    const percent = (Math.random() * (max - min) + min) / 100;
    const newBalance = +(sim.currentBalance * (1 + percent)).toFixed(8);
    const change = +(newBalance - sim.currentBalance).toFixed(8);

    sim.currentBalance = newBalance;
    sim.history.push({ date: new Date(), percent: Math.round(percent*10000)/100, change });
    await sim.save();

    // update demo balance
    await Balance.updateOne(
      { userId: sim.userId, asset: sim.asset },
      { $set: { amount: newBalance } },
      { upsert: true }
    );

    console.log(`Sim [${sim._id}] ${sim.asset}: +${(percent*100).toFixed(2)}% => ${newBalance}`);
  }
  process.exit(0);
}

runOnce().catch(err => {
  console.error(err);
  process.exit(1);
});
