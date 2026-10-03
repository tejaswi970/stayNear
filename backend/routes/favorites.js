const router = require('express').Router();
const favoriteController = require('../controllers/favoriteController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.get('/', authenticate, authorize('tenant'), favoriteController.getFavorites);
router.post('/', authenticate, authorize('tenant'), favoriteController.addFavorite);
router.delete('/:pgId', authenticate, authorize('tenant'), favoriteController.removeFavorite);

module.exports = router;
