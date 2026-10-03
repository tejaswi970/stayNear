const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/roomController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const multer = require('multer');
const roomPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Room photos must be JPG, PNG, or WEBP.'), false);
  },
});
const validate = require('../middleware/validate');

const roomValidation = [
  body('pg_id').isUUID().withMessage('A valid PG is required'),
  body('room_number').trim().notEmpty().isLength({ max: 40 }).withMessage('Room number is required'),
  body('room_type').isIn(['single', '2-sharing', '3-sharing', '4-sharing']).withMessage('Choose a supported room type'),
  body('monthly_rent_inr').isFloat({ min: 0 }).withMessage('Room rent must be zero or more'),
  body('deposit_inr').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Deposit must be zero or more'),
  body('status').optional().isIn(['available', 'maintenance']).withMessage('Invalid room status'),
];

router.get('/pg/:pgId', controller.getRooms);
router.post('/:id/images', authenticate, authorize('owner'), roomPhotoUpload.array('images', 10), controller.uploadRoomImages);
router.post('/', authenticate, authorize('owner'), roomValidation, validate, controller.manageRoom);
router.put('/:id', authenticate, authorize('owner'), roomValidation, validate, controller.manageRoom);
router.delete('/:id', authenticate, authorize('owner'), controller.deleteRoom);
module.exports = router;
