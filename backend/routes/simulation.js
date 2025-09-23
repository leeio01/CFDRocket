const express = require('express');
const router = express.Router();
const simController = require('../controllers/simulationController');
const auth = require('../middlewares/auth');

router.post('/start', auth.verifyToken, simController.startSimulation);
router.post('/pause', auth.verifyToken, simController.pauseSimulation);
router.post('/set-growth', auth.verifyToken, simController.setGrowthRate);

module.exports = router;
