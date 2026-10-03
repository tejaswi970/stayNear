const router = require('express').Router();
const reportController = require('../controllers/reportController');
const authenticate = require('../middleware/authenticate');

router.post('/', authenticate, reportController.createReport);

module.exports = router;
