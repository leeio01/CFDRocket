const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const tradeController = require('../controllers/tradeController');

router.post('/start-sim', auth, tradeController.startSimulation);
router.post('/stop-sim', auth, tradeController.stopSimulation);
router.get('/simulations', auth, tradeController.listSimulations);

module.exports = router;
