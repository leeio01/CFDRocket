const express = require('express');
const router = express.Router();
const txController = require('../controllers/transactionController');
const auth = require('../middlewares/auth');

router.post('/deposit', auth.verifyToken, txController.demoDeposit);
router.post('/withdraw', auth.verifyToken, txController.demoWithdraw);

module.exports = router;
