const express = require('express');
const multer  = require('multer');
const controller = require('./dataentry.controller');
const bulkImportController = require('./bulkimport.controller');
const frameworkImportController = require('./frameworkimport.controller');
const performanceImportController = require('./performanceimport.controller');
const matrixImportController = require('./matriximport.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // multer expects cb(error, acceptBoolean). Accept by known mimetype OR by
    // file extension (some browsers send .xlsx as application/octet-stream).
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
      'application/octet-stream',
    ];
    const okExt = /\.(xlsx|xls|csv)$/i.test(file.originalname || '');
    if (allowedMime.includes(file.mimetype) || okExt) return cb(null, true);
    return cb(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed'));
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

// ── Result Framework import (creates framework + records period actuals) ──────
router.get('/import/framework/template', frameworkImportController.downloadFrameworkTemplate);
router.post('/import/framework/preview',
  authorize('super_admin', 'me_officer', 'admin'),
  importUpload.single('file'),
  frameworkImportController.frameworkPreview
);
router.post('/import/framework',
  authorize('super_admin', 'me_officer', 'admin'),
  importUpload.single('file'),
  frameworkImportController.frameworkImport
);

// ── Standardized Performance M&E import (one template, all quarters) ──────────
router.get('/import/performance/template', performanceImportController.downloadPerformanceTemplate);
router.post('/import/performance/preview',
  authorize('super_admin', 'me_officer', 'admin'),
  importUpload.single('file'),
  performanceImportController.performancePreview
);
router.post('/import/performance',
  authorize('super_admin', 'me_officer', 'admin'),
  importUpload.single('file'),
  performanceImportController.performanceImport
);

// ── Auto-mapping strategic matrix import (zero-config, any layout) ────────────
router.post('/import/matrix/preview',
  authorize('super_admin', 'me_officer', 'admin'),
  importUpload.single('file'),
  matrixImportController.matrixPreview
);
router.post('/import/matrix',
  authorize('super_admin', 'me_officer', 'admin'),
  importUpload.single('file'),
  matrixImportController.matrixImport
);

module.exports = router;
