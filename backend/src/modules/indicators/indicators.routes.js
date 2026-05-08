const express = require('express');
const { body, validationResult } = require('express-validator');
const controller = require('./indicators.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.list);
router.get('/all-targets', controller.getAllTargets);
router.get('/stats', controller.getStats);
router.get('/:id', controller.getOne);
router.get('/:id/targets', controller.getTargets);
router.get('/:id/actuals/:institutionId', controller.getActuals);

const validateIndicator = [
  body('name').trim().notEmpty().withMessage('Indicator name is required').isLength({ max: 500 }),
  body('code').trim().notEmpty().withMessage('Code is required').isLength({ max: 50 }),
  body('outputId').isUUID().withMessage('Valid outputId required'),
  body('unit').optional().isLength({ max: 100 }),
  body('minValue').optional({ nullable: true }).isFloat(),
  body('maxValue').optional({ nullable: true }).isFloat(),
  body('baselineValue').optional({ nullable: true }).isFloat(),
  body('baselineYear').optional({ nullable: true }).isInt({ min: 2000, max: 2100 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
    next();
  },
];

router.post('/', authorize('super_admin', 'me_officer'), ...validateIndicator, controller.create);
router.patch('/:id', authorize('super_admin', 'me_officer'), controller.update);

router.post('/:id/targets', authorize('super_admin', 'me_officer', 'admin'), controller.setTargets);

module.exports = router;
