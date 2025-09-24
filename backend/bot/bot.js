require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

const API = process.env.API_URL || 'http://localhost:4000';
const ADMIN_ID = parseInt(process.env.ADMIN_CHAT_ID);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.use((ctx, next) => {
  if (ctx.from.id !== ADMIN_ID) {
    ctx.reply("❌ You are not authorized to use this bot.");
    return;
  }
  return next();
});

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

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Start Simulation ▶️", callback_data: "start" }],
        [{ text: "Pause Simulation ⏸", callback_data: "pause" }],
        [{ text: "Stop Simulation ⏹", callback_data: "stop" }],
        [{ text: "Set Growth Rate 📈", callback_data: "growth" }],
      ],
    },
  };
  ctx.reply("Select an action:", keyboard);
});

bot.command('settoken', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Usage: /settoken <jwt_token>');
  const token = parts[1].trim();
  ctx.session = ctx.session || {};
  ctx.session.token = token;
  ctx.reply('Token saved for this session. You can now use /balance and /trade_sim_start_with_token.');
});

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

bot.command('addwallet', (ctx) => {
  ctx.reply('Add wallet feature will call backend API here.');
});

bot.command('viewwallets', (ctx) => {
  ctx.reply('View wallets feature will fetch wallets from backend API.');
});

bot.command('startsimulation', async (ctx) => {
  const token = ctx.session?.token;
  if (!token) return ctx.reply('Please set your token first: /settoken <token>');
  try {
    const res = await axios.post(`${API}/api/trade/start-sim`, { asset: 'USDT', startAmount: 1000 }, { headers: { Authorization: `Bearer ${token}` } });
    ctx.reply('✅ Simulation started: ' + JSON.stringify(res.data));
  } catch (err) {
    ctx.reply('❌ Error: ' + (err.response?.data?.message || err.message));
  }
});

bot.command('pausesimulation', async (ctx) => {
  const token = ctx.session?.token;
  if (!token) return ctx.reply('Please set your token first: /settoken <token>');
  try {
    const res = await axios.post(`${API}/api/trade/pause-sim`, {}, { headers: { Authorization: `Bearer ${token}` } });
    ctx.reply('⏸ Simulation paused: ' + JSON.stringify(res.data));
  } catch (err) {
    ctx.reply('❌ Error: ' + (err.response?.data?.message || err.message));
  }
});

bot.command('stopsimulation', async (ctx) => {
  const token = ctx.session?.token;
  if (!token) return ctx.reply('Please set your token first: /settoken <token>');
  try {
    const res = await axios.post(`${API}/api/trade/stop-sim`, {}, { headers: { Authorization: `Bearer ${token}` } });
    ctx.reply('⏹ Simulation stopped: ' + JSON.stringify(res.data));
  } catch (err) {
    ctx.reply('❌ Error: ' + (err.response?.data?.message || err.message));
  }
});

bot.command('setgrowth', async (ctx) => {
  ctx.reply('📈 Please send the new growth rate (number).');
  bot.on('text', async (ctx2) => {
    const token = ctx2.session?.token;
    if (!token) return ctx2.reply('Please set your token first: /settoken <token>');
    const growthRate = parseFloat(ctx2.message.text);
    if (isNaN(growthRate)) return ctx2.reply('❌ Invalid number, please try again.');
    try {
      const res = await axios.post(`${API}/api/trade/set-growth`, { growthRate }, { headers: { Authorization: `Bearer ${token}` } });
      ctx2.reply(`✅ Growth rate set to ${growthRate}: ` + JSON.stringify(res.data));
    } catch (err) {
      ctx2.reply('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  });
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.callbackQuery.message.chat.id;
  const token = ctx.session?.token;
  if (!token) return ctx.reply('Please set your token first using /settoken <token>');

  try {
    if (data === 'start') {
      const res = await axios.post(`${API}/api/trade/start-sim`, { asset: 'USDT', startAmount: 1000 }, { headers: { Authorization: `Bearer ${token}` } });
      ctx.reply('✅ Simulation started: ' + JSON.stringify(res.data));
    }
    if (data === 'pause') {
      const res = await axios.post(`${API}/api/trade/pause-sim`, {}, { headers: { Authorization: `Bearer ${token}` } });
      ctx.reply('⏸ Simulation paused: ' + JSON.stringify(res.data));
    }
    if (data === 'stop') {
      const res = await axios.post(`${API}/api/trade/stop-sim`, {}, { headers: { Authorization: `Bearer ${token}` } });
      ctx.reply('⏹ Simulation stopped: ' + JSON.stringify(res.data));
    }
    if (data === 'growth') {
      ctx.reply('📈 Please send the new growth rate (number).');
      bot.on('text', async (ctx2) => {
        const growthRate = parseFloat(ctx2.message.text);
        if (isNaN(growthRate)) return ctx2.reply('❌ Invalid number, please try again.');
        try {
          const res = await axios.post(`${API}/api/trade/set-growth`, { growthRate }, { headers: { Authorization: `Bearer ${token}` } });
          ctx2.reply(`✅ Growth rate set to ${growthRate}: ` + JSON.stringify(res.data));
        } catch (err) {
          ctx2.reply('❌ Error: ' + (err.response?.data?.message || err.message));
        }
      });
    }
  } catch (err) {
    ctx.reply('❌ Error performing action: ' + (err.response?.data?.message || err.message));
  }

  await ctx.answerCbQuery();
});

bot.launch().then(() => console.log('Telegram bot started'));
