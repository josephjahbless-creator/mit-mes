const express = require('express');
const multer  = require('multer');
const controller = require('./dataentry.controller');
const bulkImportController = require('./bulkimport.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    cb(null, allowed.includes(file.mimetype) ? null : new Error('Only Excel/CSV files allowed'));
  },
});

const router = express.Router();
router.use(authenticate);

router.get('/actuals',              controller.listActuals);
router.get('/actuals/:id',          controller.getActual);
router.get('/actuals/:id/calculated', controller.getCalculated);
router.get('/tracking',             controller.submissionTracking);
router.get('/completeness',         authorize('super_admin', 'me_officer', 'admin'), controller.completenessReport);
router.get('/departments',          controller.listDepartments);

router.post('/actuals', authorize('super_admin', 'me_officer', 'admin', 'data_collector'), controller.submitActual);
router.patch('/actuals/:id', authorize('super_admin', 'me_officer', 'admin', 'data_collector'), controller.updateActual);

// ── 4-stage approval workflow ─────────────────────────────────────────────────
router.patch('/actuals/:id/supervisor-review', authorize('admin', 'me_officer', 'super_admin'), controller.supervisorReview);
router.patch('/actuals/:id/me-review',         authorize('me_officer', 'super_admin'),          controller.meReview);

// ── Legacy direct approve/reject (backwards compatibility) ────────────────────
router.patch('/actuals/:id/approve', authorize('super_admin', 'me_officer', 'admin'), controller.approveActual);
router.patch('/actuals/:id/reject',  authorize('super_admin', 'me_officer', 'admin'), controller.rejectActual);

// ── Submission comments ───────────────────────────────────────────────────────
router.get('/actuals/:id/comments',  controller.getComments);
router.post('/actuals/:id/comments', controller.addComment);

// ── Bulk data import ──────────────────────────────────────────────────────────
router.get('/import/template', bulkImportController.downloadTemplate);
router.post('/import/preview',
  authorize('super_admin', 'me_officer', 'admin', 'data_collector'),
  importUpload.single('file'),
  bulkImportController.previewImport
);
router.post('/import/bulk',
  authorize('super_admin', 'me_officer', 'admin', 'data_collector'),
  importUpload.single('file'),
  bulkImportController.bulkImport
);

module.exports = router;
