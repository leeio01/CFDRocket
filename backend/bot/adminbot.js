require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const mongoose = require('mongoose');

const ADMIN_ID = parseInt(process.env.ADMIN_CHAT_ID);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);

// Enable session to track delete mode
bot.use(session());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define user schema
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
  users.forEach(u => {
    msg += `ID: ${u.chatId} | ${u.name} | ${u.phone} | ${u.country} | Balance: ${u.balance}\n`;
  });
  ctx.reply(msg);
});

// Delete user flow
bot.command('deleteuser', (ctx) => {
  ctx.session.awaitingDeleteChatId = true;
  ctx.reply('Please send the Chat ID of the user you want to delete:');
});

// Handle text messages
bot.on('text', async (ctx) => {
  // Only handle delete mode
  if (ctx.session.awaitingDeleteChatId) {
    const chatId = ctx.message.text.trim();
    try {
      const user = await User.findOneAndDelete({ chatId });
      if (user) ctx.reply(`✅ User ${chatId} deleted successfully.`);
      else ctx.reply('❌ Chat ID not found. Please try again.');
    } catch (err) {
      ctx.reply('❌ Error deleting user: ' + err.message);
    }
    ctx.session.awaitingDeleteChatId = false; // reset delete mode
  }
});

// View all balances
bot.command('viewbalances', async (ctx) => {
  const users = await User.find().sort({ balance: -1 });
  if (!users.length) return ctx.reply('No users found.');
  let msg = '💰 All Balances:\n';
  users.forEach(u => {
    msg += `${u.name} | ${u.balance}\n`;
  });
  ctx.reply(msg);
});

// Launch bot
bot.launch().then(() => console.log('Admin bot started'));
