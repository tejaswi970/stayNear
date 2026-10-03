const router = require('express').Router();
const aiController = require('../controllers/aiController');
const authenticate = require('../middleware/authenticate');
const { aiLimiter } = require('../middleware/rateLimiter');

router.get('/conversations', authenticate, aiController.getConversations);
router.get('/conversations/:conversationId', authenticate, aiController.getConversation);
router.delete('/conversations/:conversationId', authenticate, aiController.deleteConversation);
router.post('/chat', aiLimiter, authenticate, aiController.chat);

module.exports = router;
