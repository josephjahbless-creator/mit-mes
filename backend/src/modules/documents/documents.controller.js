const path   = require('path');
const fs     = require('fs');
const multer = require('multer');
const prisma = require('../../config/db');

// ── Multer configuration ───────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../../../uploads/documents');

// Ensure directory exists at startup
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext      = path.extname(file.originalname);
    const base     = path.basename(file.originalname, ext)
                       .replace(/\s+/g, '_')
                       .replace(/[^a-zA-Z0-9_.-]/g, '');
    const filename = `${Date.now()}-${base}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (_req, file, cb) => {
  // Allow common document types
  const ALLOWED_MIME = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
  ];
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// Export multer middleware for use in routes
const uploadMiddleware = upload.single('file');

// ── Scoping helpers ────────────────────────────────────────────────────────────
const RESTRICTED_ROLES = ['data_collector', 'viewer'];

function buildScopeWhere(user) {
  if (RESTRICTED_ROLES.includes(user.role) && user.institutionId) {
    return { institutionId: user.institutionId };
  }
  return {};
}

// ── POST /api/documents ────────────────────────────────────────────────────────
async function uploadDoc(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const {
    name,
    description,
    category,
    fiscalYear,
    period,
    institutionId,
    departmentId,
    unitId,
    tags,
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Document name is required' });

  const fileUrl  = `/uploads/documents/${req.file.filename}`;
  const tagArray = tags
    ? tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const doc = await prisma.document.create({
    data: {
      name,
      description:   description   || null,
      category:      category       || null,
      fiscalYear:    fiscalYear     || null,
      period:        period         || null,
      fileUrl,
      fileSize:      req.file.size,
      mimeType:      req.file.mimetype,
      originalName:  req.file.originalname,
      tags:          tagArray,
      uploadedById:  req.user.id,
      institutionId: institutionId  || null,
      departmentId:  departmentId   || null,
      unitId:        unitId         || null,
    },
  });

  res.status(201).json(doc);
}

// ── GET /api/documents ─────────────────────────────────────────────────────────
async function list(req, res) {
  const { category, fiscalYear, institutionId, departmentId, unitId, search } = req.query;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const where = { ...buildScopeWhere(req.user) };

  if (category)      where.category      = category;
  if (fiscalYear)    where.fiscalYear     = fiscalYear;
  if (institutionId) where.institutionId  = institutionId;
  if (departmentId)  where.departmentId   = departmentId;
  if (unitId)        where.unitId         = unitId;

  if (search) {
    where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  res.json({ documents, total, page, limit });
}

// ── GET /api/documents/:id ─────────────────────────────────────────────────────
async function getOne(req, res) {
  const scopeWhere = buildScopeWhere(req.user);

  const doc = await prisma.document.findFirst({
    where: { id: req.params.id, ...scopeWhere },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
}

// ── PATCH /api/documents/:id ───────────────────────────────────────────────────
async function update(req, res) {
  const { name, description, category, tags } = req.body;

  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Scope check for restricted roles
  const scopeWhere = buildScopeWhere(req.user);
  if (scopeWhere.institutionId && doc.institutionId !== scopeWhere.institutionId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const tagArray = tags != null
    ? tags.split(',').map(t => t.trim()).filter(Boolean)
    : undefined;

  const data = {};
  if (name        !== undefined) data.name        = name;
  if (description !== undefined) data.description = description;
  if (category    !== undefined) data.category    = category;
  if (tagArray    !== undefined) data.tags        = tagArray;

  const updated = await prisma.document.update({
    where: { id: req.params.id },
    data,
  });
  res.json(updated);
}

// ── DELETE /api/documents/:id ──────────────────────────────────────────────────
async function remove(req, res) {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Delete physical file from disk
  if (doc.fileUrl) {
    // fileUrl is like /uploads/documents/filename.pdf
    const filename  = path.basename(doc.fileUrl);
    const filePath  = path.join(UPLOAD_DIR, filename);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Could not delete file from disk:', filePath, err.message);
    }
  }

  await prisma.document.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

module.exports = { uploadMiddleware, uploadDoc, list, getOne, update, remove };
