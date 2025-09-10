const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Balance = require('../models/Balance');

router.get('/', auth, async (req, res) => {
  const balances = await Balance.find({ userId: req.userId });
  res.json(balances);
});

module.exports = router;
