const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const auth = require('../middlewares/auth');

// Add wallet (owner only)
router.post('/add', auth.verifyToken, walletController.addWallet);

// List all wallets (any logged-in user can view)
router.get('/', auth.verifyToken, walletController.listWallets);

module.exports = router;
