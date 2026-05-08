'use strict';

const prisma = require('../../config/db');

async function list(req, res) {
    const { fiscalYear, institutionId, category } = req.query;
  const where = {};
  if (fiscalYear) where.fiscalYear = fiscalYear;
  if (institutionId) where.institutionId = institutionId;
  if (category) where.category = category;

  const entries = await prisma.swotEntry.findMany({
    where,
    include: {
      institution: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(entries);
}

async function create(req, res) {
    const { category, area, description, impact, institutionId, fiscalYear } = req.body;
  if (!category || !area || !description || !fiscalYear) {
    return res.status(400).json({ error: 'category, area, description, and fiscalYear are required' });
  }
  const entry = await prisma.swotEntry.create({
    data: {
      category,
      area,
      description,
      impact: impact || null,
      institutionId: institutionId || null,
      fiscalYear,
      createdById: req.user.id,
    },
    include: {
      institution: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  res.status(201).json(entry);
}

async function update(req, res) {
    const { id } = req.params;
  const { category, area, description, impact, institutionId, fiscalYear } = req.body;
  const entry = await prisma.swotEntry.update({
    where: { id },
    data: {
      ...(category !== undefined && { category }),
      ...(area !== undefined && { area }),
      ...(description !== undefined && { description }),
      ...(impact !== undefined && { impact }),
      ...(institutionId !== undefined && { institutionId: institutionId || null }),
      ...(fiscalYear !== undefined && { fiscalYear }),
    },
    include: {
      institution: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  res.json(entry);
}

async function remove(req, res) {
    const { id } = req.params;
  await prisma.swotEntry.delete({ where: { id } });
  res.status(204).end();
}

module.exports = { list, create, update, remove };
