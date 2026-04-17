const router = require('express').Router();
const prisma  = require('../../config/db');
const { authenticate } = require('../../middleware/auth');

// GET /api/departments — list all departments
router.get('/', authenticate, async (req, res) => {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, orderNo: true },
    orderBy: { orderNo: 'asc' },
  });
  res.json(departments);
});

// GET /api/departments/:id/units — list units for a department
router.get('/:id/units', authenticate, async (req, res) => {
  const units = await prisma.unit.findMany({
    where: { departmentId: req.params.id, isActive: true },
    select: { id: true, code: true, name: true, orderNo: true },
    orderBy: { orderNo: 'asc' },
  });
  res.json(units);
});

module.exports = router;
