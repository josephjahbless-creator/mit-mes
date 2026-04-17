/**
 * seed-departments.js
 * Seeds MIT's official Departments and Units into the departments/units tables.
 * Run once after the main seed:
 *   node prisma/seed-departments.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEPARTMENTS = [
  {
    id: 'dept-dahrm', code: 'DAHRM', orderNo: 1,
    name: 'Department of Administration and Human Resource Management',
    description: 'Responsible for human resources management, staff welfare, training, and general administrative services across the Ministry.',
    units: [],
  },
  {
    id: 'dept-did', code: 'DID', orderNo: 2,
    name: 'Department of Industrial Development',
    description: 'Coordinates industrial development policies, strategies, diagnostic studies and programmes for priority industrial sub-sectors.',
    units: [],
  },
  {
    id: 'dept-dpp', code: 'DPP', orderNo: 3,
    name: 'Department of Policy and Planning',
    description: 'Develops and coordinates policy frameworks, strategic planning, monitoring and evaluation of Ministry plans and programmes.',
    units: [],
  },
  {
    id: 'dept-dtd', code: 'DTD', orderNo: 4,
    name: 'Department of Trade and Development',
    description: 'Promotes domestic and international trade development, export promotion, and facilitates trade facilitation infrastructure.',
    units: [],
  },
  {
    id: 'dept-dsme', code: 'DSME', orderNo: 5,
    name: 'Department of Small and Medium Enterprises',
    description: 'Promotes SME development, business formalization, cluster development and improved market competitiveness for MSMEs.',
    units: [],
  },
  {
    id: 'dept-dti', code: 'DTI', orderNo: 6,
    name: 'Department of Trade Integration',
    description: 'Coordinates regional and international trade integration negotiations including EAC, AfCFTA, SADC and bilateral trade agreements.',
    units: [],
  },
  {
    id: 'dept-fau', code: 'FAU', orderNo: 7,
    name: 'Finance and Accounting Unit',
    description: 'Manages Ministry financial resources, budget execution, accounting services and financial reporting.',
    units: [],
  },
  {
    id: 'dept-pmu', code: 'PMU', orderNo: 8,
    name: 'Procurement Management Unit',
    description: 'Oversees procurement processes, supplier management and ensures compliance with public procurement regulations.',
    units: [],
  },
  {
    id: 'dept-lsu', code: 'LSU', orderNo: 9,
    name: 'Legal Service Unit',
    description: 'Provides legal advisory services, contract management, and ensures regulatory compliance across Ministry operations.',
    units: [],
  },
  {
    id: 'dept-ictu', code: 'ICTU', orderNo: 10,
    name: 'Information Communication and Technology Unit',
    description: 'Manages ICT infrastructure, digital systems, e-government services and ICT support to all Ministry departments.',
    units: [],
  },
  {
    id: 'dept-gcu', code: 'GCU', orderNo: 11,
    name: 'Government Communication Unit',
    description: 'Coordinates government communications, public relations, media engagement and knowledge management activities.',
    units: [],
  },
  {
    id: 'dept-iau', code: 'IAU', orderNo: 12,
    name: 'Internal Audit Unit',
    description: 'Conducts internal audit functions, risk management assessments and ensures sound internal control systems.',
    units: [],
  },
  {
    id: 'dept-meu', code: 'MEU', orderNo: 13,
    name: 'Monitoring and Evaluation Unit',
    description: 'Coordinates M&E activities, performance reporting, evaluation studies and CAG recommendation follow-up across the Ministry.',
    units: [],
  },
];

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  MIT Departments & Units Seed');
  console.log('═══════════════════════════════════════════════════\n');

  for (const dept of DEPARTMENTS) {
    const { units, ...deptData } = dept;
    const created = await prisma.department.upsert({
      where: { code: deptData.code },
      update: { name: deptData.name, description: deptData.description, orderNo: deptData.orderNo },
      create: { id: deptData.id, code: deptData.code, name: deptData.name, description: deptData.description, orderNo: deptData.orderNo },
    });
    console.log(`  ✓ [${created.code.padEnd(6)}] ${created.name}`);
  }

  const count = await prisma.department.count();
  console.log(`\n  ✅  Done — ${count} departments in database\n`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
