/**
 * MIT M&E System, User Seeder
 * Creates the full set of designated system users.
 * Safe to re-run: uses upsert so existing accounts are not duplicated.
 * Default password: MIT@2025!  (users must change on first login)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'MIT@2025!';

// ── Institution IDs (from live DB) ────────────────────────────────────────────
const INST = {
  BRELA:    'bba049e1-e3ad-49e6-83be-43773aedbeb5',
  CAMARTEC: '6bfa3b56-0dc8-415c-85aa-feff3707b96b',
  CBE:      '117af89c-a04e-4c96-904c-0747615a80f8',
  FCC:      '5357acf6-b769-461e-9292-f1b57e9233fa',
  FCT:      'ea672db3-9f2d-43a8-821c-d3c9790e7fad',
  MITHQ:    'ac7acda9-91cf-4e60-aaab-1f3a7e88ce53',
  NDC:      '94f623d7-90c6-4fa6-bf6a-b1ab0974f3db',
  SIDO:     '542cc61e-0163-461d-b117-313df7e7d5f4',
  TANTRADE: 'b3f784eb-725f-4171-8804-6f6f87bfe186',
  TBS:      'b7c7ab34-e333-496b-888e-46ea77fd7bb6',
  TEMDO:    '462a1a77-e37b-43b1-88cd-93a2fb2ba7a3',
  TIRDO:    'b92731e5-d756-4c80-a293-16c0c0b3a203',
  WMA:      '5e42ad9e-e688-4fbc-9284-b93c108ba5e4',
  WRRB:     '05ff845f-7f2f-415f-a162-1db37056c892',
};

// ── Department IDs (from live DB) ─────────────────────────────────────────────
const DEPT = {
  DAHRM: 'dept-dahrm',
  DID:   'dept-did',
  DPP:   'dept-dpp',
  DSME:  'dept-dsme',
  DTD:   'dept-dtd',
  DTI:   'dept-dti',
  FAU:   'dept-fau',
  GCU:   'dept-gcu',
  IAU:   'dept-iau',
  ICTU:  'dept-ictu',
  LSU:   'dept-lsu',
  MEU:   'dept-meu',
  PMU:   'dept-pmu',
};

// ── User definitions ──────────────────────────────────────────────────────────
const USERS = [

  // ════════════════════════════════════════════════════════════════════════════
  // 1. SENIOR POLITICAL & ADMINISTRATIVE LEADERSHIP  (viewer)
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: 'Minister of Industry and Trade',
    email: 'minister@mit.go.tz',
    role: 'viewer',
    institutionId: INST.MITHQ,
    title: 'Minister',
  },
  {
    name: 'Deputy Minister of Industry and Trade',
    email: 'deputy.minister@mit.go.tz',
    role: 'viewer',
    institutionId: INST.MITHQ,
    title: 'Deputy Minister',
  },
  {
    name: 'Permanent Secretary, Ministry of Industry and Trade',
    email: 'ps@mit.go.tz',
    role: 'viewer',
    institutionId: INST.MITHQ,
    title: 'Permanent Secretary',
  },
  {
    name: 'Deputy Secretary General, Ministry of Industry and Trade',
    email: 'dsg@mit.go.tz',
    role: 'viewer',
    institutionId: INST.MITHQ,
    title: 'Deputy Secretary General',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 2. DIRECTORS GENERAL, MIT Institutions  (viewer)
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: 'Director General, BRELA',
    email: 'dg@brela.go.tz',
    role: 'viewer',
    institutionId: INST.BRELA,
    title: 'Director General',
  },
  {
    name: 'Director General, CAMARTEC',
    email: 'dg@camartec.go.tz',
    role: 'viewer',
    institutionId: INST.CAMARTEC,
    title: 'Director General',
  },
  {
    name: 'Principal, College of Business Education',
    email: 'principal@cbe.ac.tz',
    role: 'viewer',
    institutionId: INST.CBE,
    title: 'Principal',
  },
  {
    name: 'Director General, Fair Competition Commission',
    email: 'dg@fcc.go.tz',
    role: 'viewer',
    institutionId: INST.FCC,
    title: 'Director General',
  },
  {
    name: 'Presiding Officer, Fair Competition Tribunal',
    email: 'presiding.officer@fct.go.tz',
    role: 'viewer',
    institutionId: INST.FCT,
    title: 'Presiding Officer',
  },
  {
    name: 'Director General, National Development Corporation',
    email: 'dg@ndc.go.tz',
    role: 'viewer',
    institutionId: INST.NDC,
    title: 'Director General',
  },
  {
    name: 'Director General, SIDO',
    email: 'dg@sido.go.tz',
    role: 'viewer',
    institutionId: INST.SIDO,
    title: 'Director General',
  },
  {
    name: 'Director General, TANTRADE',
    email: 'dg@tantrade.go.tz',
    role: 'viewer',
    institutionId: INST.TANTRADE,
    title: 'Director General',
  },
  {
    name: 'Director General, Tanzania Bureau of Standards',
    email: 'dg@tbs.go.tz',
    role: 'viewer',
    institutionId: INST.TBS,
    title: 'Director General',
  },
  {
    name: 'Director General, TEMDO',
    email: 'dg@temdo.go.tz',
    role: 'viewer',
    institutionId: INST.TEMDO,
    title: 'Director General',
  },
  {
    name: 'Director General, TIRDO',
    email: 'dg@tirdo.go.tz',
    role: 'viewer',
    institutionId: INST.TIRDO,
    title: 'Director General',
  },
  {
    name: 'Chief Executive Officer, Weights and Measures Agency',
    email: 'ceo@wma.go.tz',
    role: 'viewer',
    institutionId: INST.WMA,
    title: 'Chief Executive Officer',
  },
  {
    name: 'Director General, Warehouse Receipts Regulatory Board',
    email: 'dg@wrrb.go.tz',
    role: 'viewer',
    institutionId: INST.WRRB,
    title: 'Director General',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 3. MIT DIRECTORS, Departments & Units  (viewer)
  //    (dahrm/did/dtd/dti/dsme directors already exist as admin;
  //     dpp director exists as me_officer; remaining units covered below)
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: 'Director, Department of Policy and Planning',
    email: 'director.dpp@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.DPP,
    title: 'Director',
  },
  {
    name: 'Director, Department of Administration and Human Resource Management',
    email: 'director.dahrm@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.DAHRM,
    title: 'Director',
  },
  {
    name: 'Director, Department of Industrial Development',
    email: 'director.did@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.DID,
    title: 'Director',
  },
  {
    name: 'Director, Department of Trade Development',
    email: 'director.dtd@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.DTD,
    title: 'Director',
  },
  {
    name: 'Director, Department of Small and Medium Enterprises',
    email: 'director.dsme@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.DSME,
    title: 'Director',
  },
  {
    name: 'Director, Department of Trade Integration',
    email: 'director.dti@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.DTI,
    title: 'Director',
  },
  {
    name: 'Director, Finance and Accounting Unit',
    email: 'director.fau@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.FAU,
    title: 'Director',
  },
  {
    name: 'Director, Government Communication Unit',
    email: 'director.gcu@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.GCU,
    title: 'Director',
  },
  {
    name: 'Director, Internal Audit Unit',
    email: 'director.iau@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.IAU,
    title: 'Director',
  },
  {
    name: 'Director, ICT Unit',
    email: 'director.ictu@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.ICTU,
    title: 'Director',
  },
  {
    name: 'Director, Legal Service Unit',
    email: 'director.lsu@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.LSU,
    title: 'Director',
  },
  {
    name: 'Director, Monitoring and Evaluation Unit',
    email: 'director.meu@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.MEU,
    title: 'Director',
  },
  {
    name: 'Director, Procurement Management Unit',
    email: 'director.pmu@mit.go.tz',
    role: 'viewer',
    departmentId: DEPT.PMU,
    title: 'Director',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 4. M&E OFFICERS, MEU  (me_officer)
  //    (meu.head, meu.officer, me.coordinator already exist, adding 2 more)
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: 'M&E Officer II, MEU',
    email: 'meu.officer2@mit.go.tz',
    role: 'me_officer',
    departmentId: DEPT.MEU,
    title: 'M&E Officer II',
  },
  {
    name: 'M&E Officer III, MEU',
    email: 'meu.officer3@mit.go.tz',
    role: 'me_officer',
    departmentId: DEPT.MEU,
    title: 'M&E Officer III',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 5. M&E CHAMPIONS, Institutions  (data_collector)
  //    (fcc/fct/ndc/sido/tbs/temdo/tirdo/tantrade/wma/wrrb already have
  //     data officers, adding champions for BRELA, CAMARTEC, CBE)
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: 'M&E Champion, BRELA',
    email: 'me.champion@brela.go.tz',
    role: 'data_collector',
    institutionId: INST.BRELA,
    title: 'M&E Champion',
  },
  {
    name: 'M&E Champion, CAMARTEC',
    email: 'me.champion@camartec.go.tz',
    role: 'data_collector',
    institutionId: INST.CAMARTEC,
    title: 'M&E Champion',
  },
  {
    name: 'M&E Champion, CBE',
    email: 'me.champion@cbe.ac.tz',
    role: 'data_collector',
    institutionId: INST.CBE,
    title: 'M&E Champion',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 6. M&E CHAMPIONS, MIT Departments & Units  (data_collector)
  //    (dahrm/did/dpp/dtd/dsme/dti officers already exist)
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: 'M&E Champion, Finance and Accounting Unit',
    email: 'me.champion.fau@mit.go.tz',
    role: 'data_collector',
    departmentId: DEPT.FAU,
    title: 'M&E Champion',
  },
  {
    name: 'M&E Champion, Government Communication Unit',
    email: 'me.champion.gcu@mit.go.tz',
    role: 'data_collector',
    departmentId: DEPT.GCU,
    title: 'M&E Champion',
  },
  {
    name: 'M&E Champion, Internal Audit Unit',
    email: 'me.champion.iau@mit.go.tz',
    role: 'data_collector',
    departmentId: DEPT.IAU,
    title: 'M&E Champion',
  },
  {
    name: 'M&E Champion, ICT Unit',
    email: 'me.champion.ictu@mit.go.tz',
    role: 'data_collector',
    departmentId: DEPT.ICTU,
    title: 'M&E Champion',
  },
  {
    name: 'M&E Champion, Legal Service Unit',
    email: 'me.champion.lsu@mit.go.tz',
    role: 'data_collector',
    departmentId: DEPT.LSU,
    title: 'M&E Champion',
  },
  {
    name: 'M&E Champion, Monitoring and Evaluation Unit',
    email: 'me.champion.meu@mit.go.tz',
    role: 'data_collector',
    departmentId: DEPT.MEU,
    title: 'M&E Champion',
  },
  {
    name: 'M&E Champion, Procurement Management Unit',
    email: 'me.champion.pmu@mit.go.tz',
    role: 'data_collector',
    departmentId: DEPT.PMU,
    title: 'M&E Champion',
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────
async function main() {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  let created = 0, skipped = 0;

  console.log(`\n🔐  Hashed default password. Starting upsert of ${USERS.length} users...\n`);

  for (const u of USERS) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        console.log(`  SKIP  ${u.email.padEnd(40)} (already exists as ${existing.role})`);
        skipped++;
        continue;
      }
      await prisma.user.create({
        data: {
          name:         u.name,
          email:        u.email,
          passwordHash: hash,
          role:         u.role,
          isActive:     true,
          institutionId: u.institutionId || null,
          departmentId:  u.departmentId  || null,
        },
      });
      console.log(`  CREATE ${u.email.padEnd(40)} [${u.role}]  ${u.title}`);
      created++;
    } catch (err) {
      console.error(`  ERROR  ${u.email}: ${err.message}`);
    }
  }

  console.log(`\n✅  Done, ${created} created, ${skipped} skipped (already existed).`);
  console.log(`🔑  Default password for all new accounts: ${DEFAULT_PASSWORD}`);
  console.log(`⚠️   Users should change their password on first login.\n`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
