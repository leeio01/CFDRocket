require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const API = process.env.API_URL || 'http://localhost:4000';

bot.start((ctx) => {
  ctx.reply('Welcome to TradeBot demo. Link account via the web app then use /balance.');
});

bot.command('balance', async (ctx) => {
  const tgId = ctx.from.id;
  // In a production app you'd map telegramId to userId when they link account
  // For this demo, we expect user to provide an auth token via /settoken <token>
  ctx.reply('Please use /settoken <token> to register your API token for demo.');
});

bot.command('settoken', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Usage: /settoken <jwt_token>');
  const token = parts[1].trim();
  try {
    const res = await axios.get(`${API}/api/balance`, { headers: { Authorization: `Bearer ${token}` } });
    const balances = res.data;
    if (!balances || balances.length === 0) return ctx.reply('No balances found.');
    let msg = 'Balances:\n';
    balances.forEach(b => msg += `${b.asset}: ${b.amount}\n`);
    ctx.reply(msg);
  } catch (err) {
    ctx.reply('Error fetching balances. Make sure token is valid and backend is reachable.');
  }
});

bot.command('trade_sim_start', async (ctx) => {
  ctx.reply('To start simulation from Telegram: use /settoken then /trade_sim_start_with_token <token>');
});

bot.command('trade_sim_start_with_token', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Usage: /trade_sim_start_with_token <token>');
  const token = parts[1].trim();
  try {
    const res = await axios.post(`${API}/api/trade/start-sim`, { asset: 'USDT', startAmount: 1000 }, { headers: { Authorization: `Bearer ${token}` } });
    ctx.reply('Simulation started: ' + JSON.stringify(res.data));
  } catch (err) {
    ctx.reply('Error starting simulation: ' + (err.response?.data?.message || err.message));
  }
});

bot.launch().then(() => console.log('Telegram bot started'));
