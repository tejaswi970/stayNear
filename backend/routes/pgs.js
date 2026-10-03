const router = require('express').Router();
const { body } = require('express-validator');
const multer = require('multer');
const pgController = require('../controllers/pgController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WEBP images are allowed.'), false);
  },
});
const upiQrUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('UPI QR must be a JPG, PNG, or WEBP image.'), false);
  },
});

const pgValidation = [
  body('name').trim().notEmpty().withMessage('PG name is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('rent').isFloat({ min: 0 }).withMessage('Valid rent amount is required'),
  body('room_type').isIn(['single', '2-sharing', '3-sharing', '4-sharing']).withMessage('Valid room type is required'),
  body('availability').optional().isIn(['available', 'few_rooms', 'full']).withMessage('Invalid availability value'),
];

router.post('/images/draft', authenticate, authorize('owner'), upload.array('images', 10), pgController.uploadDraftImages);
router.post('/upi-qr/draft', authenticate, authorize('owner'), upiQrUpload.single('image'), pgController.uploadDraftUPIQR);

// Public routes
router.get('/', pgController.getPGs);
router.get('/:id', pgController.getPGById);

// Owner routes
router.get('/owner/my-listings', authenticate, authorize('owner'), pgController.getOwnerPGs);
router.get('/:id/upi-qr', authenticate, authorize('owner'), pgController.getOwnerUPIQR);
router.post('/', authenticate, authorize('owner'), pgValidation, validate, pgController.createPG);
router.put('/:id', authenticate, authorize('owner'), pgController.updatePG);
router.delete('/:id', authenticate, authorize('owner'), pgController.deletePG);
router.post('/:id/images', authenticate, authorize('owner'), upload.array('images', 10), pgController.uploadImages);

module.exports = router;
