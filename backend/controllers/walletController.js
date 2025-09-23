const Wallet = require('../models/wallet');
const User = require('../models/users');

// Add a new wallet (owner only)
exports.addWallet = async (req, res) => {
  try {
    const { currency, depositAddress, notes } = req.body;

    // Check if user is owner
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Forbidden: Only owner can add wallets' });
    }

    const wallet = new Wallet({
      ownerUserId: req.user._id,
      currency,
      depositAddress,
      notes
    });

    await wallet.save();
    res.status(201).json({ message: 'Wallet added successfully', wallet });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List all wallets
exports.listWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find();
    res.status(200).json(wallets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
