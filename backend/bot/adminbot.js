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

bot.use((ctx, next) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ You are not authorized.");
  return next();
});

bot.start((ctx) => {
  const menu = `
Admin Bot - CFDROCKET
Available commands:
/viewusers - View all users
/viewuser_phone <phone> - View user by phone
/viewuser_name <name> - View user by name
/viewuser_country <country> - View users by country
/adduser - Add a new user
/deleteuser <chatId> - Delete user
/viewbalances - View all balances
/topbalances <10|50|100> - View top N users by balance
`;
  ctx.reply(menu);
});

bot.command('viewusers', async (ctx) => {
  const users = await User.find();
  if (!users.length) return ctx.reply('No users found.');
  let msg = '📋 All Users:\n';
  users.forEach(u => msg += `ID: ${u.chatId} | ${u.name} | ${u.phone} | ${u.country} | Balance: ${u.balance}\n`);
  ctx.reply(msg);
});

bot.command('viewuser_phone', async (ctx) => {
  const phone = ctx.message.text.split(' ')[1];
  if (!phone) return ctx.reply('Usage: /viewuser_phone <phone>');
  const user = await User.findOne({ phone });
  if (!user) return ctx.reply('User not found.');
  ctx.reply(`ID: ${user.chatId} | ${user.name} | ${user.phone} | ${user.country} | Balance: ${user.balance}`);
});

bot.command('viewuser_name', async (ctx) => {
  const name = ctx.message.text.split(' ').slice(1).join(' ');
  if (!name) return ctx.reply('Usage: /viewuser_name <name>');
  const users = await User.find({ name: new RegExp(name, 'i') });
  if (!users.length) return ctx.reply('No users found.');
  let msg = 'Users:\n';
  users.forEach(u => msg += `ID: ${u.chatId} | ${u.name} | ${u.phone} | ${u.country} | Balance: ${u.balance}\n`);
  ctx.reply(msg);
});

bot.command('viewuser_country', async (ctx) => {
  const country = ctx.message.text.split(' ')[1];
  if (!country) return ctx.reply('Usage: /viewuser_country <country>');
  const users = await User.find({ country: new RegExp(country, 'i') });
  if (!users.length) return ctx.reply('No users found.');
  let msg = 'Users:\n';
  users.forEach(u => msg += `ID: ${u.chatId} | ${u.name} | ${u.phone} | ${u.country} | Balance: ${u.balance}\n`);
  ctx.reply(msg);
});

bot.command('adduser', async (ctx) => {
  ctx.reply('Send user info as: name,phone,city,country,age,balance');
  
  const listener = async (ctx2) => {
    if (ctx2.from.id !== ADMIN_ID) return;
    const parts = ctx2.message.text.split(',');
    if (parts.length < 6) return ctx2.reply('Invalid format.');
    const [name, phone, city, country, age, balance] = parts.map(p => p.trim());
    const chatId = Date.now().toString() + Math.floor(Math.random() * 1000);
    try {
      const user = new User({ chatId, name, phone, city, country, age, balance: Number(balance) });
      await user.save();
      ctx2.reply(`✅ User added: ${name}`);
    } catch (err) {
      if (err.code === 11000) return ctx2.reply('❌ Duplicate user.');
      ctx2.reply('❌ Error adding user: ' + err.message);
    }
    bot.off('text', listener); // remove listener after use
  };
  
  bot.on('text', listener);
});

bot.command('deleteuser', async (ctx) => {
  const chatId = ctx.message.text.split(' ')[1];
  if (!chatId) return ctx.reply('Usage: /deleteuser <chatId>');
  const res = await User.findOneAndDelete({ chatId });
  if (res) ctx.reply(`✅ User ${chatId} deleted.`);
  else ctx.reply('❌ User not found.');
});

bot.command('viewbalances', async (ctx) => {
  const users = await User.find().sort({ balance: -1 });
  if (!users.length) return ctx.reply('No users found.');
  let msg = '💰 All Balances:\n';
  users.forEach(u => msg += `${u.name} | ${u.balance}\n`);
  ctx.reply(msg);
});

bot.command('topbalances', async (ctx) => {
  const n = parseInt(ctx.message.text.split(' ')[1]);
  if (!n || ![10,50,100].includes(n)) return ctx.reply('Usage: /topbalances <10|50|100>');
  const users = await User.find().sort({ balance: -1 }).limit(n);
  let msg = `💰 Top ${n} Users by Balance:\n`;
  users.forEach(u => msg += `${u.name} | ${u.balance}\n`);
  ctx.reply(msg);
});

bot.launch().then(() => console.log('Admin bot started'));
