const User = require('../models/User');
const Balance = require('../models/Balance');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this';

// REGISTER (no hashing)
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'email + password required' });

    const found = await User.findOne({ email });
    if (found) return res.status(400).json({ message: 'user exists' });

    // store plain text password (for testing only!)
    const user = await User.create({ name, email, phone, password });

    // create demo balance
    await Balance.create({ userId: user._id, asset: 'USDT', amount: 1000, isDemo: true });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
};

// LOGIN (plain text password)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await User.findOne({ email });
    if (!u) return res.status(401).json({ message: 'invalid credentials' });

    // plain text check
    if (u.password !== password)
      return res.status(401).json({ message: 'invalid credentials' });

    const token = jwt.sign({ userId: u._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: u._id, email: u.email, name: u.name } });
  } catch (err) {
    res.status(500).json({ message: 'server error' });
  }
};
