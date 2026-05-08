const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../../config/db');

async function list(req, res) {
  // super_admin can see all institutions (including inactive) to enable reactivation;
  // all other roles only see active ones so inactive institutions don't appear in dropdowns
  const where = req.user.role === 'super_admin' ? {} : { isActive: true };
  const institutions = await prisma.institution.findMany({
    where,
    select: { id: true, name: true, code: true, region: true, contactEmail: true, isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(institutions);
}

async function getOne(req, res) {
  const institution = await prisma.institution.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, code: true, region: true, contactEmail: true, isActive: true },
  });
  if (!institution) return res.status(404).json({ error: 'Not found' });
  res.json(institution);
}

async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, code, region, contactEmail } = req.body;
  try {
    const institution = await prisma.institution.create({
      data: { name, code, region, contactEmail },
    });
    res.status(201).json(institution);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Code already exists' });
    throw e;
  }
}

async function update(req, res) {
  // admin role is scoped to their own institution only; super_admin can update any
  if (req.user.role === 'admin' && req.user.institutionId !== req.params.id) {
    return res.status(403).json({ error: 'You can only update your own institution' });
  }
  const { name, region, contactEmail, isActive } = req.body;
  const institution = await prisma.institution.update({
    where: { id: req.params.id },
    data: { name, region, contactEmail, isActive },
  });
  res.json(institution);
}

async function regenerateApiKey(req, res) {
  const institution = await prisma.institution.update({
    where: { id: req.params.id },
    data: { apiKey: uuidv4() },
    select: { id: true, name: true, apiKey: true },
  });
  res.json(institution);
}

module.exports = { list, getOne, create, update, regenerateApiKey };
