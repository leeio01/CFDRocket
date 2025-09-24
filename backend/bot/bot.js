require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

const API = process.env.API_URL || 'http://localhost:4000';
const ADMIN_ID = parseInt(process.env.ADMIN_CHAT_ID);
const proxy = process.env.PROXY;
const agent = new SocksProxyAgent(proxy);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  telegram: { agent }
});

// Middleware to restrict access to admin
bot.use((ctx, next) => {
  if (ctx.from.id !== ADMIN_ID) {
    ctx.reply("❌ You are not authorized to use this bot.");
    return;
  }
  return next();
});

// Start command with admin-only welcome
bot.start((ctx) => {
  const welcomeMessage = `
👋 Welcome to FDROCKET Earning Bot!

This bot is for demo/testing purposes only.
You can:
- Add/manage wallets
- Simulate trades
- Monitor demo deposits/withdrawals
- Adjust simulation growth rate
- Start / pause / stop simulations

Commands:
/addwallet - Add wallet
/viewwallets - View wallets
/startsimulation - Start simulation
/pausesimulation - Pause simulation
/stopsimulation - Stop simulation
/setgrowth - Set demo growth rate
/balance - View your balances (requires /settoken)
/settoken <token> - Link your demo API token
/trade_sim_start_with_token <token> - Start trading simulation
`;
  ctx.reply(welcomeMessage);
});

// Command: set API token
bot.command('settoken', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Usage: /settoken <jwt_token>');
  const token = parts[1].trim();
  ctx.session = ctx.session || {};
  ctx.session.token = token;
  ctx.reply('Token saved for this session. You can now use /balance and /trade_sim_start_with_token.');
});

// Command: view balances
bot.command('balance', async (ctx) => {
  const token = ctx.session?.token;
  if (!token) return ctx.reply('Please set your token first: /settoken <token>');

  try {
    const res = await axios.get(`${API}/api/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const balances = res.data;
    if (!balances || balances.length === 0) return ctx.reply('No balances found.');
    let msg = '💰 *Balances:*\n';
    balances.forEach((b) => (msg += `${b.asset}: ${b.amount}\n`));
    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.reply('Error fetching balances. Make sure token is valid and backend is reachable.');
  }
});

// Command: start trading simulation
bot.command('trade_sim_start', (ctx) => {
  ctx.reply('To start simulation from Telegram: use /settoken then /trade_sim_start_with_token <token>');
});

bot.command('trade_sim_start_with_token', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Usage: /trade_sim_start_with_token <token>');
  const token = parts[1].trim();

  try {
    const res = await axios.post(
      `${API}/api/trade/start-sim`,
      { asset: 'USDT', startAmount: 1000 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ctx.reply('✅ Simulation started: ' + JSON.stringify(res.data));
  } catch (err) {
    ctx.reply('❌ Error starting simulation: ' + (err.response?.data?.message || err.message));
  }
});

// Example admin-only commands for wallet management
bot.command('addwallet', (ctx) => {
  ctx.reply('Add wallet feature will call backend API here (demo).');
});

bot.command('viewwallets', (ctx) => {
  ctx.reply('View wallets feature will fetch wallets from backend API (demo).');
});

bot.command('startsimulation', (ctx) => {
  ctx.reply('Simulation started (demo).');
});

bot.command('pausesimulation', (ctx) => {
  ctx.reply('Simulation paused (demo).');
});

bot.command('stopsimulation', (ctx) => {
  ctx.reply('Simulation stopped (demo).');
});

bot.command('setgrowth', (ctx) => {
  ctx.reply('Set growth rate feature will call backend API (demo).');
});

// Launch the bot
bot.launch().then(() => console.log('Telegram bot started with proxy'));
