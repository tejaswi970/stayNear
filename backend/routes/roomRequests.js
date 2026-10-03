const router = require('express').Router();
const controller = require('../controllers/roomController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const multer = require('multer');

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Receipt must be a JPG, PNG, WEBP, or PDF file.'), false);
  },
});

router.use(authenticate);
router.post('/', authorize('tenant'), controller.createRequest);
router.get('/my', authorize('tenant'), controller.getMyRequests);
router.get('/owner', authorize('owner'), controller.getOwnerRequests);
router.get('/:id/messages', controller.getMessages);
router.post('/:id/messages', controller.sendMessage);
router.get('/:id/payment-proofs', controller.getPaymentProofs);
router.post('/:id/payment-proofs', authorize('tenant'), receiptUpload.single('receipt'), controller.uploadPaymentProof);
router.patch('/:id/payment-proofs/:proofId', authorize('owner'), controller.reviewPaymentProof);
router.patch('/:id/action', controller.transition);
module.exports = router;
