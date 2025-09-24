require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const balanceRoutes = require('./routes/balance');
const tradeRoutes = require('./routes/trade');

// Express app setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// DB connection
connectDB().catch(err => {
  console.error('DB connect error', err);
  process.exit(1);
});

// Backend routes
app.use('/api/auth', authRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/trade', tradeRoutes);

app.get('/', (req, res) => res.send('Tradebot backend running'));

// --- Import Telegram bot ---
require('./telegramBot');  // <--- all bot logic moved here

// Start Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
