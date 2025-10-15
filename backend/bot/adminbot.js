require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

const ADMIN_ID = parseInt(process.env.ADMIN_CHAT_ID);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  name: String,
  phone: String,
  city: String,
  country: String,
  age: String,
  balance: { type: Number, default: 0 },
});
const User = mongoose.model('User', userSchema);

// Authorization middleware
bot.use((ctx, next) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ You are not authorized.");
  return next();
});

// Start command
bot.start((ctx) => {
  const menu = `
Admin Bot - CFDROCKET
Available commands:
/viewusers - View all users
/deleteuser - Delete a user by chatId
/viewbalances - View all balances
`;
  ctx.reply(menu);
});

// View all users
bot.command('viewusers', async (ctx) => {
  const users = await User.find();
  if (!users.length) return ctx.reply('No users found.');
  let msg = '📋 All Users:\n';
  users.forEach(u => msg += `ID: ${u.chatId} | ${u.name} | ${u.phone} | ${u.country} | Balance: ${u.balance}\n`);
  ctx.reply(msg);
});

// Delete user flow
bot.command('deleteuser', (ctx) => {
  ctx.reply('Please send the Chat ID of the user you want to delete:');

  const listener = async (ctx2) => {
    if (ctx2.from.id !== ADMIN_ID) return;
    const chatId = ctx2.message.text.trim();
    const user = await User.findOneAndDelete({ chatId });
    if (user) ctx2.reply(`✅ User ${chatId} deleted successfully.`);
    else ctx2.reply('❌ Chat ID not found. Please try again.');
    
    bot.off('text', listener); // Remove listener after deletion attempt
  };

  bot.on('text', listener);
});

// View all balances
bot.command('viewbalances', async (ctx) => {
  const users = await User.find().sort({ balance: -1 });
  if (!users.length) return ctx.reply('No users found.');
  let msg = '💰 All Balances:\n';
  users.forEach(u => msg += `${u.name} | ${u.balance}\n`);
  ctx.reply(msg);
});

// Launch bot
bot.launch().then(() => console.log('Admin bot started'));
