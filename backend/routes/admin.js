const router = require('express').Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const adminOnly = [authenticate, authorize('admin')];

router.get('/stats', ...adminOnly, adminController.getStats);
router.get('/listings', ...adminOnly, adminController.getAllListings);
router.patch('/listings/:id/verify', ...adminOnly, adminController.verifyListing);
router.patch('/listings/:id/verification', ...adminOnly, adminController.verifyListing);
router.delete('/listings/:id', ...adminOnly, adminController.deleteListing);
router.get('/reports', ...adminOnly, adminController.getReports);
router.patch('/reports/:id/resolve', ...adminOnly, adminController.resolveReport);
router.get('/users', ...adminOnly, adminController.getUsers);

module.exports = router;
