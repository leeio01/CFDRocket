require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const balanceRoutes = require('./routes/balance');
const tradeRoutes = require('./routes/trade');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to database
connectDB().catch(err => {
  console.error('DB connect error', err);
  process.exit(1);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/trade', tradeRoutes);

// Health check route
app.get('/api/health', (req, res) => res.send('Backend is running ✅'));

// Root route (friendly message)
app.get('/', (req, res) => res.send('CFDRocket backend running'));

// Start server on Render-provided port
const PORT = process.env.PORT; // no default needed, Render provides it
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
