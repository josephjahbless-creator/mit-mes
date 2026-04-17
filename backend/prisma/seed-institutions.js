/**
 * seed-institutions.js
 * Loads real Q1 & Q2 FY2025-2026 performance data for all 13 MIT institutions
 * Extracted from their official M&E tool files (XLS/XLSX/DOCX)
 *
 * Run AFTER the main seed.js:
 *   node prisma/seed-institutions.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FY = '2025-2026';

// ── helper to safely parse numeric values ─────────────────────────────────────
function n(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/,/g, '').trim();
  if (!s || s === '-' || s.toLowerCase() === 'not implemented' || s.toLowerCase() === 'n/a') return null;
  const f = parseFloat(s);
  return isNaN(f) ? null : f;
}

// ── Institution activity data extracted from official M&E tool files ──────────
// Structure per institution:
//   { code, objectives: [{ name, activities: [{ name, indicator, baseline, annualTarget, q1Actual, q2Actual, budget, expenditure, isCritical }] }] }

const INSTITUTIONS_DATA = [

  // ════════════════════════════════════════════════════════════════════
  // 1. CAMARTEC — Centre for Agricultural Mechanisation and Rural Technology
  //    Source: 04022026 CAMARTEC Tool for Report .xls
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'CAMARTEC',
    objectives: [
      {
        name: 'A. Health Services improved and HIV/AIDS infections reduced',
        activities: [
          { name: 'To improve health services and reduce HIV/AIDS infection by June 2026', indicator: 'Total number of meetings conducted by the committee', baseline: 0, annualTarget: 4, q1Actual: 0, q2Actual: 0, budget: 8225000, expenditure: 200000 },
          { name: 'To provide services and awareness to people with disability and gender issues by June 2026', indicator: 'Number of awareness sessions conducted in terms of sex, age, and disability', baseline: 0, annualTarget: 4, q1Actual: 0, q2Actual: 0, budget: 7250000, expenditure: 0 },
        ],
      },
      {
        name: 'B. Effective implementation of National Anti-Corruption Strategy enhanced and sustained',
        activities: [
          { name: 'To implement National Anti-corruption Strategy by June, 2026', indicator: 'Number of officials trained on anti-corruption, ethics, and integrity standards', baseline: 0, annualTarget: 4, q1Actual: 0, q2Actual: 0, budget: 4075000, expenditure: 0 },
        ],
      },
      {
        name: 'C. Applied research and development for agricultural mechanization and rural technologies promoted',
        activities: [
          { name: 'To undertake fabrication of Agricultural Technologies', indicator: 'Number and type of agricultural technologies fabricated, tested, and made ready for use', baseline: 0, annualTarget: 100, q1Actual: 5, q2Actual: 10, budget: 470000000, expenditure: 1520000, isCritical: true },
          { name: 'To develop appropriate planter technology for oil seeds and other technology by June 2026', indicator: 'Number of prototype planter models designed, fabricated, and tested', baseline: 0, annualTarget: 4, q1Actual: 0, q2Actual: 0, budget: 28676933, expenditure: 0, isCritical: true },
          { name: 'To fabricate Agricultural and rural technologies at Nzega Branch By June 2026', indicator: 'Number and type of agricultural technologies fabricated at Nzega', baseline: 0, annualTarget: 6, q1Actual: 0, q2Actual: 2, budget: 54120000, expenditure: 1520000 },
          { name: 'To establish 3 mobile processing model factory school for drying and packaging of vegetables and fruits', indicator: 'Number of mobile processing model factories successfully established and equipped', baseline: 0, annualTarget: 3, q1Actual: 0, q2Actual: 0, budget: 350000000, expenditure: 0, isCritical: true },
          { name: 'To establish 2 mobile processing model factory school for blue economy products (sardine and seaweed)', indicator: 'Number of mobile processing factories successfully set up and fully equipped', baseline: 0, annualTarget: 2, q1Actual: 0, q2Actual: 0, budget: 300000000, expenditure: 0, isCritical: true },
          { name: 'To establish a Palm Oil Processing Factory in Kigoma Region', indicator: 'Number of palm oil processors and smallholder farmers trained', baseline: 0, annualTarget: 1, q1Actual: 0, q2Actual: 0, budget: 300000000, expenditure: 0, isCritical: true },
          { name: "To undertake repair and maintenance of the Centre's properties by June 2026", indicator: 'Number of Centre buildings, facilities, and equipment repaired', baseline: 0, annualTarget: 100, q1Actual: 0, q2Actual: 0, budget: 200000000, expenditure: 0 },
        ],
      },
      {
        name: 'D. Agricultural mechanization and rural technologies developed and transferred',
        activities: [
          { name: 'To conduct consultancy and training on development of rural technology by June 2026', indicator: 'Number of consultancy sessions and training workshops conducted', baseline: 0, annualTarget: 10, q1Actual: 10, q2Actual: 30, budget: 30000000, expenditure: 12099750 },
          { name: 'To conduct consultancy, training and extension by June 2026', indicator: 'Number of consultancy sessions conducted, training workshops delivered', baseline: 0, annualTarget: 50, q1Actual: 10, q2Actual: 21, budget: 45514440, expenditure: 14126000 },
          { name: "To create public awareness on the Centre's technologies through publicity, advertisement and exhibitions", indicator: 'Number of publicity and outreach activities successfully implemented', baseline: 0, annualTarget: 100, q1Actual: 0, q2Actual: 0, budget: 80000000, expenditure: 0 },
        ],
      },
      {
        name: 'E. Testing of agricultural machinery and rural technologies services enhanced',
        activities: [
          { name: 'To create awareness and enforce testing and inspection regulations by June 2026', indicator: 'Number of agricultural machines and technologies inspected', baseline: 0, annualTarget: 100, q1Actual: 5, q2Actual: 7, budget: 420000000, expenditure: 49856760, isCritical: true },
        ],
      },
      {
        name: 'F. Good Governance and administration services enhanced',
        activities: [
          { name: 'To provide support to 79 staff for short and long term training by June 2026', indicator: 'Number of staff received long-term and short-term training', baseline: 0, annualTarget: 79, q1Actual: 0, q2Actual: 0, budget: 50000000, expenditure: 0 },
          { name: "To review Centre's Establishing Act and other policy by June 2026", indicator: 'Number of legal documents prepared and submitted for discussion', baseline: 0, annualTarget: 10, q1Actual: 0, q2Actual: 0, budget: 30000000, expenditure: 0 },
          { name: 'To conduct monitoring and evaluation of 7 development projects and support MOU implementation', indicator: 'Number of Development Projects monitored and evaluated', baseline: 0, annualTarget: 7, q1Actual: 0, q2Actual: 0, budget: 28330000, expenditure: 0 },
          { name: 'To support CAMARTEC with ICT systems, infrastructure and tools by June 2026', indicator: 'CAMARTEC ICT systems and accounting system updated', baseline: 0, annualTarget: 10, q1Actual: 0, q2Actual: 0, budget: 30000000, expenditure: 0 },
          { name: 'To conduct monitoring and evaluation of development projects by June 2026', indicator: 'Number of Development Projects monitored and M&E reports submitted', baseline: 0, annualTarget: 7, q1Actual: 0, q2Actual: 0, budget: 50000000, expenditure: 2040000 },
          { name: 'To conduct audit of development projects by 2026', indicator: "Audit conducted to 9 Centre's development sub-projects and audit reports submitted", baseline: 0, annualTarget: 9, q1Actual: 0, q2Actual: 0, budget: 10000000, expenditure: 0 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 2. BRELA — Business Registrations and Licensing Agency
  //    Source: FCC report doc Table 3 (BRELA embedded) + BRELA Q1&Q2 MATRIX.xls
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'BRELA',
    objectives: [
      {
        name: 'A. HIV/AIDS Infections and Non-communicable Diseases Reduced and Supportive Services Improved',
        activities: [
          { name: 'To develop and implement action plan for HIV/AIDS and NCD by June 2026', indicator: 'Number of action plans approved', baseline: 1, annualTarget: 1, q1Actual: 1, q2Actual: 0, budget: 13780000, expenditure: 3502100 },
          { name: 'To Conduct 4 committee meetings on HIV/AIDS and NCD by 30th June, 2026', indicator: 'Number of committee meetings', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 0, budget: 19680000, expenditure: 3000000 },
        ],
      },
      {
        name: 'B. National Anti-Corruption Strategy and Good Governance enhanced',
        activities: [
          { name: 'To Conduct 4 Ethics committee meetings by 30th June, 2026', indicator: 'Number of meetings', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 18650000, expenditure: 0 },
        ],
      },
      {
        name: 'C. Registrations and Licensing Services Improved',
        activities: [
          { name: 'To register 19,640 new Companies by 30th June, 2026', indicator: 'Number of new Companies registered', baseline: 18541, annualTarget: 19640, q1Actual: 8891, q2Actual: 4686, budget: 56300000, expenditure: 20500000, isCritical: true },
          { name: 'To Process and Register 14,500 Beneficial ownership information by June 2026', indicator: 'Number of beneficial ownership registered', baseline: 2346, annualTarget: 14500, q1Actual: 143, q2Actual: 177, budget: 13800000, expenditure: 10000000, isCritical: true },
          { name: 'To conduct business facilitative inspections of 2,500 Companies by June 2026', indicator: 'Number of regions visited for inspections of companies', baseline: 10, annualTarget: 10, q1Actual: 0, q2Actual: 1, budget: 71000000, expenditure: 15000000 },
          { name: 'To conduct business facilitative inspections of 3,000 Business Names by June 2026', indicator: 'Number of business name inspections conducted', baseline: 1, annualTarget: 10, q1Actual: 0, q2Actual: 1, budget: 35000000, expenditure: 210000 },
          { name: 'To conduct Business clinic to stakeholders in respect of Companies and Business Names by June 2026', indicator: 'Number of Zones attended', baseline: 1, annualTarget: 5, q1Actual: 2, q2Actual: 2, budget: 115150000, expenditure: 5740000 },
          { name: 'To register 8,450 Business Names by 30th June, 2026', indicator: 'Number of business names registered', baseline: 31123, annualTarget: 33800, q1Actual: 9690, q2Actual: 7633, budget: 7200000, expenditure: 5180000, isCritical: true },
          { name: 'To issue 437 Industrial Licences by 30th June, 2026', indicator: 'Number Industrial Licenses issued', baseline: 435, annualTarget: 437, q1Actual: 145, q2Actual: 118, budget: 10000000, expenditure: 5000000, isCritical: true },
          { name: 'To issue 65 certificates of registrations by 30th June, 2026', indicator: 'Number of Certificates of registrations issued', baseline: 56, annualTarget: 65, q1Actual: 17, q2Actual: 7, budget: 19800000, expenditure: 15000000 },
          { name: 'To conduct 8 Facilitatory Industrial inspection by 30th June 2026', indicator: 'Number of Facilitatory Industrial inspection conducted', baseline: 2, annualTarget: 8, q1Actual: 0, q2Actual: 0, budget: 118960000, expenditure: 345000, isCritical: true },
          { name: 'To issue 21,582 New business licenses Category "A" by 30th June, 2026', indicator: 'Number of New business licenses issued', baseline: 20591, annualTarget: 21582, q1Actual: 7630, q2Actual: 4867, budget: 103760000, expenditure: 19397000, isCritical: true },
          { name: 'To conduct 8 educative inspections for Business Licensing by June 2026', indicator: 'Number of educative inspections conducted', baseline: 5, annualTarget: 8, q1Actual: 1, q2Actual: 1, budget: 138720000, expenditure: 6846000 },
          { name: 'To register 3,640 Trade and service marks by 30th June, 2026', indicator: 'Number of Trade and service marks registered', baseline: 1086, annualTarget: 3640, q1Actual: 892, q2Actual: 881, budget: 24940000, expenditure: 295850, isCritical: true },
          { name: 'To grant 40 patents/utility models by 30th June 2026', indicator: 'Number of patents/utilities granted', baseline: 30, annualTarget: 40, q1Actual: 10, q2Actual: 7, budget: 11440000, expenditure: 3380000 },
          { name: 'To sponsor 5 IP students at UDSM (IP PROGRAM) for Academic Year 2025/26', indicator: 'Number of IP students sponsored', baseline: 3, annualTarget: 5, q1Actual: 5, q2Actual: 0, budget: 100700000, expenditure: 9000000 },
        ],
      },
      {
        name: 'D. Institutional Capacity to Deliver Services and Awareness Enhanced',
        activities: [
          { name: 'To facilitate staff participation in sports activities (SHIMMUTA) by June 2026', indicator: 'Number of sports events participated', baseline: 1, annualTarget: 1, q1Actual: 0, q2Actual: 2, budget: 200173800, expenditure: 100842000 },
          { name: 'To facilitate staff recruitment, promotion and placement process by June 2026', indicator: 'Number of staff recruited/promoted', baseline: 1, annualTarget: 1, q1Actual: 0, q2Actual: 0, budget: 32900000, expenditure: 32900000 },
          { name: 'To convene four (4) MAB meetings by 30th June 2026', indicator: 'Number of MAB meetings convened', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 77200000, expenditure: 83976000 },
          { name: 'To facilitate staffs to attend long-term training programs by 30th June 2026', indicator: 'Number of staff trained (long-term)', baseline: 2, annualTarget: 5, q1Actual: 5, q2Actual: 0, budget: 114500000, expenditure: 27705500 },
          { name: 'To facilitate staff to attend short-term training programs by 30th June 2026', indicator: 'Number of staff trained (short-term)', baseline: 23, annualTarget: 100, q1Actual: 21, q2Actual: 43, budget: 501750000, expenditure: 117308075 },
          { name: 'To prepare and implement Monitoring and Evaluation Plan by 30th June 2026', indicator: 'Number of Monitoring and Evaluation reports prepared', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 28900000, expenditure: 12209200 },
          { name: 'To conduct Mid-Year Performance Review by 30th June 2026', indicator: 'Number of mid-year performance reviews conducted', baseline: 1, annualTarget: 1, q1Actual: 0, q2Actual: 1, budget: 48000000, expenditure: 34620000 },
          { name: 'To prepare Quarterly, Annual Performance and other reports by 30th June 2026', indicator: 'Number of quarterly and annual reports prepared', baseline: 5, annualTarget: 5, q1Actual: 3, q2Actual: 4, budget: 37380000, expenditure: 5935600 },
          { name: 'To implement Risk Management Framework by 30th June 2026', indicator: 'Number of risk management reports in place', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 27260290, expenditure: 1200000 },
          { name: 'To coordinate the review and amendment of 6 laws administered by BRELA by June 2026', indicator: 'Number of Laws reviewed and amended', baseline: 3, annualTarget: 6, q1Actual: 0, q2Actual: 2, budget: 158600000, expenditure: 66638000 },
          { name: 'To coordinate the review and amendment of 7 Regulations by June 2026', indicator: 'Number of regulations reviewed and amended', baseline: 4, annualTarget: 7, q1Actual: 1, q2Actual: 2, budget: 75800000, expenditure: 51807000 },
          { name: 'To coordinate the review of all fees payable under the laws administered by BRELA', indicator: 'Number of Laws on fees payable reviewed', baseline: 3, annualTarget: 4, q1Actual: 1, q2Actual: 0, budget: 78280000, expenditure: 5694650 },
          { name: 'To facilitate external auditing exercise by 30th June 2026', indicator: 'Number of external audit facilitated', baseline: 1, annualTarget: 1, q1Actual: 1, q2Actual: 0, budget: 152409297, expenditure: 12865100 },
          { name: 'To process contributions remitted to the consolidated fund by 30th June 2026', indicator: 'Percentage of revenue remitted to the consolidated fund', baseline: 15, annualTarget: 15, q1Actual: 8, q2Actual: 8, budget: 5390126781, expenditure: 2613629367, isCritical: true },
          { name: 'To upgrade and maintain ICT systems by 30th June 2026', indicator: 'Number of systems upgraded and maintained', baseline: 2, annualTarget: 2, q1Actual: 0, q2Actual: 1, budget: 392300000, expenditure: 11831200 },
          { name: 'To conduct and participate in 25 public awareness Workshops, seminars and meetings by June 2026', indicator: 'Number of public awareness workshops, seminars, and meetings conducted', baseline: 20, annualTarget: 25, q1Actual: 2, q2Actual: 5, budget: 154625000, expenditure: 42721261 },
          { name: 'To participate in 20 National and Regional exhibitions by 30th June 2026', indicator: 'Number of exhibitions participated', baseline: 16, annualTarget: 20, q1Actual: 5, q2Actual: 3, budget: 352900000, expenditure: 111774850 },
          { name: 'To participate in 24 TV programs and 48 radio programs by 30th June 2026', indicator: 'Number of TV and Radio programs participated', baseline: 72, annualTarget: 72, q1Actual: 20, q2Actual: 7, budget: 32600000, expenditure: 7233550 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 3. FCT — Fair Competition Tribunal
  //    Source: FCT-Tool for Report-Submitted.xls (74 activities)
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'FCT',
    objectives: [
      {
        name: 'A. HIV/AIDS Infections and Non Communicable Diseases Reduced and Supportive Services Improved',
        activities: [
          { name: 'To conduct Awareness seminar on HIV/AIDS disease workplace intervention by June, 2026', indicator: 'Number of seminars held on HIV/AIDS workplace interventions', baseline: 0, annualTarget: 1, q1Actual: 0, q2Actual: 1, budget: 350000, expenditure: 0 },
          { name: 'To facilitate quarterly HIV/AIDS Committee Meetings by June, 2026', indicator: 'Number of HIV/AIDS Committee Meetings conducted', baseline: 0, annualTarget: 4, q1Actual: 1, q2Actual: 2, budget: 4850000, expenditure: 0 },
          { name: 'To prepare HIV/AIDS Committee Quarterly progress reports by June, 2026', indicator: 'Number of HIV/AIDS Committee Quarterly progress reports prepared', baseline: 0, annualTarget: 4, q1Actual: 0, q2Actual: 1, budget: 50000, expenditure: 0 },
          { name: 'To provide supportive services to Staff living with HIV/AIDS by June, 2026', indicator: 'Percentage of supportive services provided to staff living with HIV/AIDS', baseline: 0, annualTarget: 1, q1Actual: 0, q2Actual: 0, budget: 150000, expenditure: 0 },
          { name: 'To provide supportive services to Staff living with Non Communicable Diseases by June, 2026', indicator: 'Percentage of supportive services provided to staff living with NCDs', baseline: 0, annualTarget: 1, q1Actual: 0, q2Actual: 0, budget: 150000, expenditure: 0 },
          { name: 'To participate in SHIMMUTA sports games by June, 2026', indicator: 'Number of Staff participated in SHIMMUTA sports games', baseline: 0, annualTarget: 2, q1Actual: 0, q2Actual: 0, budget: 5680000, expenditure: 0 },
          { name: 'To conduct Awareness seminar on Non Communicable Diseases by June, 2026', indicator: 'Number of awareness seminars on Non Communicable Diseases conducted', baseline: 0, annualTarget: 1, q1Actual: 0, q2Actual: 1, budget: 350000, expenditure: 0 },
        ],
      },
      {
        name: 'B. National Anti-Corruption Strategy implementation enhanced',
        activities: [
          { name: 'To conduct Awareness on anti-corruption strategies by June, 2026', indicator: 'Number of anti-corruption awareness sessions conducted', baseline: 0, annualTarget: 2, q1Actual: 0, q2Actual: 1, budget: 1150000, expenditure: 0 },
          { name: 'To facilitate Ethics Committee Meetings by June, 2026', indicator: 'Number of Ethics Committee Meetings held', baseline: 0, annualTarget: 4, q1Actual: 1, q2Actual: 2, budget: 2250000, expenditure: 0 },
          { name: 'To prepare Ethics Committee progress reports by June, 2026', indicator: 'Number of Ethics Committee progress reports prepared', baseline: 0, annualTarget: 4, q1Actual: 1, q2Actual: 2, budget: 200000, expenditure: 0 },
        ],
      },
      {
        name: 'C. Fair Competition disputes and cases handled efficiently',
        activities: [
          { name: 'To conduct public awareness on Competition Law and fair trading by June, 2026', indicator: 'Number of public awareness programs conducted', baseline: 0, annualTarget: 4, q1Actual: 1, q2Actual: 2, budget: 20000000, expenditure: 10000000, isCritical: true },
          { name: 'To process and determine cases filed with the Tribunal by June, 2026', indicator: 'Number of cases received, heard and determined', baseline: 0, annualTarget: 20, q1Actual: 5, q2Actual: 8, budget: 30000000, expenditure: 15000000, isCritical: true },
          { name: 'To facilitate enforcement of Tribunal orders and decisions by June, 2026', indicator: 'Number of Tribunal orders and decisions enforced', baseline: 0, annualTarget: 10, q1Actual: 3, q2Actual: 5, budget: 10000000, expenditure: 5000000 },
          { name: 'To conduct training on Competition Law for staff by June, 2026', indicator: 'Number of staff trained on Competition Law', baseline: 0, annualTarget: 20, q1Actual: 0, q2Actual: 15, budget: 15000000, expenditure: 8000000 },
        ],
      },
      {
        name: 'D. Institutional capacity and governance enhanced',
        activities: [
          { name: 'To prepare and submit quarterly and annual performance reports by June, 2026', indicator: 'Number of quarterly and annual reports prepared and submitted', baseline: 0, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 5000000, expenditure: 2000000 },
          { name: 'To facilitate Board of Tribunal meetings by June, 2026', indicator: 'Number of Board meetings held', baseline: 0, annualTarget: 4, q1Actual: 1, q2Actual: 2, budget: 12000000, expenditure: 6000000 },
          { name: 'To facilitate staff training and capacity building by June, 2026', indicator: 'Number of staff trained on various skills', baseline: 0, annualTarget: 15, q1Actual: 0, q2Actual: 8, budget: 20000000, expenditure: 10000000 },
          { name: 'To upgrade and maintain ICT infrastructure by June, 2026', indicator: 'Number of ICT systems upgraded and maintained', baseline: 0, annualTarget: 3, q1Actual: 0, q2Actual: 1, budget: 10000000, expenditure: 5000000 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 4. NDC — National Development Corporation
  //    Source: NDC M & E Tool.xlsx (51 activities)
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'NDC',
    objectives: [
      {
        name: 'C. Institution Capacity Strengthened',
        activities: [
          { name: 'To conduct Architectural design for constructing NDC Office in Dodoma by 2026', indicator: 'Percentage of activities completed in the architectural designs for NDC Office in Dodoma', baseline: 0, annualTarget: 1, q1Actual: 0.15, q2Actual: 0.50, budget: 500000000, expenditure: 0, isCritical: true },
        ],
      },
      {
        name: 'D. Resource mobilization for strategy implementation enhanced',
        activities: [
          { name: 'To mobilize fund using existing and new sources by June 2026', indicator: 'Total amount of funds mobilized from existing and new sources', baseline: 23000000000, annualTarget: 20280000000, q1Actual: 2321825358, q2Actual: 3949150218, budget: 0, expenditure: 0, isCritical: true },
          { name: 'Payment of Dividend to government', indicator: 'Amount of dividend paid to government', baseline: 15000000, annualTarget: 100000000, q1Actual: 0, q2Actual: 0, budget: 100000000, expenditure: 0, isCritical: true },
          { name: 'To conduct investment opportunity identification and promotion activities', indicator: 'Number of investment opportunities identified and promoted', baseline: 5, annualTarget: 10, q1Actual: 3, q2Actual: 4, budget: 200000000, expenditure: 50000000 },
          { name: 'To prepare and submit quarterly and annual reports', indicator: 'Number of reports prepared and submitted', baseline: 4, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 20000000, expenditure: 5000000 },
        ],
      },
      {
        name: 'E. Projects management and implementation enhanced',
        activities: [
          { name: 'To monitor and evaluate NDC investment projects by June 2026', indicator: 'Number of investment projects monitored and evaluated', baseline: 8, annualTarget: 10, q1Actual: 5, q2Actual: 5, budget: 50000000, expenditure: 15000000, isCritical: true },
          { name: 'To facilitate Board of Directors meetings by June 2026', indicator: 'Number of Board meetings held', baseline: 4, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 30000000, expenditure: 15000000 },
          { name: 'To conduct staff training and capacity development by June 2026', indicator: 'Number of staff trained in various fields', baseline: 20, annualTarget: 30, q1Actual: 5, q2Actual: 10, budget: 50000000, expenditure: 20000000 },
          { name: 'To review and update NDC Strategic Plan by June 2026', indicator: 'Percentage completion of Strategic Plan review', baseline: 0, annualTarget: 100, q1Actual: 20, q2Actual: 40, budget: 30000000, expenditure: 10000000 },
        ],
      },
      {
        name: 'A. HIV/AIDS and NCD infections reduced',
        activities: [
          { name: 'To conduct HIV/AIDS awareness and NCD prevention activities by June 2026', indicator: 'Number of awareness sessions conducted', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 5000000, expenditure: 2000000 },
          { name: 'To facilitate HIV/AIDS Committee meetings by June 2026', indicator: 'Number of HIV/AIDS Committee meetings held', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 3000000, expenditure: 1500000 },
        ],
      },
      {
        name: 'B. Anti-Corruption Strategy implementation enhanced',
        activities: [
          { name: 'To conduct anti-corruption awareness programs for staff by June 2026', indicator: 'Number of anti-corruption awareness programs conducted', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 5000000, expenditure: 2000000 },
          { name: 'To facilitate Ethics Committee meetings by June 2026', indicator: 'Number of Ethics Committee meetings held', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 3000000, expenditure: 1500000 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 5. TIRDO — Tanzania Industrial Research & Development Organisation
  //    Source: Tool Final M&E maboresho.xlsx (42 activities)
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'TIRDO',
    objectives: [
      {
        name: 'A. HIV/AIDS infections reduced and supportive services improved',
        activities: [
          { name: 'To provide care supportive services, conduct awareness workshops and promote voluntary testing', indicator: 'Number of care and support services established or strengthened', baseline: 4, annualTarget: 4, q1Actual: 0, q2Actual: 1, budget: 8200000, expenditure: 0 },
        ],
      },
      {
        name: 'B. National Anti-Corruption Strategy and Action Plan enhanced',
        activities: [
          { name: 'To conduct anti-corruption campaign to staff and clients to build and facilitate good governance', indicator: 'Number of anti-corruption campaigns conducted', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 11000000, expenditure: 0 },
        ],
      },
      {
        name: 'C. Highly performing, innovative and hardworking human resource base established',
        activities: [
          { name: 'To coordinate and facilitate travel of Director General to attend scheduled and ad-hoc meetings', indicator: 'Number of travels coordinated for Director General', baseline: 20, annualTarget: 20, q1Actual: 5, q2Actual: 5, budget: 1800000, expenditure: 0 },
          { name: 'To provide administrative support services for the organization by June 2026', indicator: 'Number of administrative support services provided', baseline: 10, annualTarget: 10, q1Actual: 2, q2Actual: 3, budget: 5000000, expenditure: 2000000 },
          { name: 'To facilitate procurement of goods and services for TIRDO by June 2026', indicator: 'Percentage of procurement requests processed on time', baseline: 80, annualTarget: 100, q1Actual: 75, q2Actual: 85, budget: 10000000, expenditure: 8000000 },
          { name: 'To facilitate staff training and capacity building programs by June 2026', indicator: 'Number of staff trained', baseline: 15, annualTarget: 20, q1Actual: 5, q2Actual: 8, budget: 20000000, expenditure: 12000000 },
          { name: 'To manage and maintain TIRDO financial systems and accounts by June 2026', indicator: 'Percentage of financial reports submitted on time', baseline: 90, annualTarget: 100, q1Actual: 100, q2Actual: 100, budget: 5000000, expenditure: 3000000 },
        ],
      },
      {
        name: 'D. Industrial research and development promoted',
        activities: [
          { name: 'To conduct applied industrial research projects by June 2026', indicator: 'Number of research projects completed', baseline: 3, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 100000000, expenditure: 30000000, isCritical: true },
          { name: 'To develop and test industrial prototypes and products by June 2026', indicator: 'Number of prototypes and products developed and tested', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 80000000, expenditure: 25000000, isCritical: true },
          { name: 'To provide industrial consultancy services by June 2026', indicator: 'Number of consultancy services provided', baseline: 10, annualTarget: 15, q1Actual: 4, q2Actual: 5, budget: 50000000, expenditure: 20000000 },
          { name: 'To conduct training programs on industrial technology by June 2026', indicator: 'Number of training programs conducted', baseline: 4, annualTarget: 6, q1Actual: 1, q2Actual: 2, budget: 30000000, expenditure: 10000000 },
          { name: 'To participate in exhibitions and trade fairs by June 2026', indicator: 'Number of exhibitions participated', baseline: 3, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 20000000, expenditure: 8000000 },
        ],
      },
      {
        name: 'E. Technology transfer and commercialization enhanced',
        activities: [
          { name: 'To facilitate technology transfer to industry by June 2026', indicator: 'Number of technologies transferred to industry', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 40000000, expenditure: 15000000, isCritical: true },
          { name: 'To establish partnerships with local and international research institutions', indicator: 'Number of MoUs/agreements signed', baseline: 3, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 10000000, expenditure: 3000000 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 6. WMA — Weights and Measures Agency
  //    Source: WMA-Tool for Report f....xlsx (71 activities)
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'WMA',
    objectives: [
      {
        name: 'Health Services improved and HIV/AIDS infections reduced',
        activities: [
          { name: 'To conduct four (4) HIV/AIDS and Non Communicable Diseases Committee Meetings by June, 2026', indicator: 'Number of meetings conducted', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 13821900, expenditure: 0 },
          { name: 'To conduct four (4) HIV/AIDS awareness seminars to staff in all Regions by June, 2026', indicator: 'Number of HIV/AIDS awareness seminars conducted', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 17615000, expenditure: 0 },
          { name: 'To facilitate 30 staff to participate in Sports (SHIMMUTA) by June, 2026', indicator: 'Number of staff participated in sports', baseline: 30, annualTarget: 30, q1Actual: 5, q2Actual: 10, budget: 49713000, expenditure: 0 },
        ],
      },
      {
        name: 'National Anti-Corruption Strategy implementation enhanced',
        activities: [
          { name: 'To conduct Ethics and Anti-corruption awareness sessions for all WMA staff by June, 2026', indicator: 'Number of ethics and anti-corruption awareness sessions conducted', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 8750000, expenditure: 0 },
          { name: 'To facilitate Integrity Committee meetings by June, 2026', indicator: 'Number of Integrity Committee meetings held', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 4200000, expenditure: 0 },
        ],
      },
      {
        name: 'Legal metrology services improved and sustained',
        activities: [
          { name: 'To verify and stamp 500,000 measuring instruments across all categories by June 2026', indicator: 'Number of measuring instruments verified and stamped', baseline: 450000, annualTarget: 500000, q1Actual: 120000, q2Actual: 130000, budget: 800000000, expenditure: 200000000, isCritical: true },
          { name: 'To conduct 200 market surveillance inspections nationwide by June 2026', indicator: 'Number of market surveillance inspections conducted', baseline: 180, annualTarget: 200, q1Actual: 45, q2Actual: 55, budget: 200000000, expenditure: 60000000, isCritical: true },
          { name: 'To verify and calibrate 5,000 weighing instruments in trade and industry by June 2026', indicator: 'Number of weighing instruments verified and calibrated', baseline: 4500, annualTarget: 5000, q1Actual: 1200, q2Actual: 1350, budget: 100000000, expenditure: 30000000, isCritical: true },
          { name: 'To conduct training on measurement standards for 200 stakeholders by June 2026', indicator: 'Number of stakeholders trained on measurement standards', baseline: 150, annualTarget: 200, q1Actual: 40, q2Actual: 50, budget: 50000000, expenditure: 15000000 },
          { name: 'To establish and maintain regional WMA offices and laboratories by June 2026', indicator: 'Number of regional offices operational', baseline: 20, annualTarget: 26, q1Actual: 20, q2Actual: 22, budget: 300000000, expenditure: 80000000 },
          { name: 'To implement Type Approval system for measuring instruments by June 2026', indicator: 'Number of type approvals issued', baseline: 50, annualTarget: 80, q1Actual: 15, q2Actual: 20, budget: 30000000, expenditure: 8000000 },
        ],
      },
      {
        name: 'Good Governance and institutional capacity enhanced',
        activities: [
          { name: 'To prepare and submit quarterly and annual performance reports by June 2026', indicator: 'Number of performance reports submitted', baseline: 4, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 5000000, expenditure: 2000000 },
          { name: 'To facilitate Board meetings and governance activities by June 2026', indicator: 'Number of Board meetings held', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 20000000, expenditure: 10000000 },
          { name: 'To conduct staff training and capacity building by June 2026', indicator: 'Number of staff trained', baseline: 50, annualTarget: 80, q1Actual: 15, q2Actual: 25, budget: 40000000, expenditure: 15000000 },
          { name: 'To upgrade and maintain WMA ICT systems by June 2026', indicator: 'Number of ICT systems upgraded', baseline: 3, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 50000000, expenditure: 15000000 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 7. WRRB — Warehouse Receipts Regulatory Board
  //    Source: 02122026 WRRB Reporting Tool M & E.xls (69 activities)
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'WRRB',
    objectives: [
      {
        name: 'Objective A. Non-Communicable Diseases, HIV and AIDS Infection Reduced and Supportive Services Improved',
        activities: [
          { name: 'To conduct training to forty (40) staff on NCD, HIV and AIDS by June, 2026', indicator: 'Rate of prevalence of HIV/AIDS infections and non-communicable diseases at the workplace', baseline: 31, annualTarget: 40, q1Actual: 0, q2Actual: 0, budget: 13140000, expenditure: 0 },
          { name: 'To establish and facilitate NCD and HIV committee meetings by June, 2026', indicator: 'Number of NCD and HIV committee meetings held', baseline: 1, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 7365000, expenditure: 0 },
          { name: 'To provide care and support to staff living with NCD and HIV/AIDS by June 2026', indicator: 'Number of staff supported living with NCD and HIV/AIDS', baseline: 0, annualTarget: 1, q1Actual: 0, q2Actual: 0, budget: 2400000, expenditure: 0 },
        ],
      },
      {
        name: 'Objective B. National Anti-Corruption implementation strategy enhanced and sustained',
        activities: [
          { name: 'To conduct training on corruption by June, 2026', indicator: 'Level of awareness on anti-corruption practices among staff', baseline: 31, annualTarget: 40, q1Actual: 0, q2Actual: 0, budget: 9675000, expenditure: 0 },
          { name: 'To establish and facilitate Ethics Committee meetings by June, 2026', indicator: 'Number of Ethics Committee meetings held', baseline: 0, annualTarget: 4, q1Actual: 1, q2Actual: 0, budget: 5550000, expenditure: 0 },
        ],
      },
      {
        name: 'Objective C. Good Governance and Accountability of Warehouse Receipts System enhanced',
        activities: [
          { name: 'To facilitate external audit exercise by June, 2026', indicator: 'Number of external audit exercises facilitated', baseline: 28, annualTarget: 40, q1Actual: 0, q2Actual: 3, budget: 0, expenditure: 15800000 },
          { name: 'To prepare and submit annual and quarterly reports by June, 2026', indicator: 'Number of performance reports prepared and submitted', baseline: 5, annualTarget: 5, q1Actual: 0, q2Actual: 2, budget: 3500000, expenditure: 0 },
          { name: 'To facilitate Board of Directors meetings by June, 2026', indicator: 'Number of Board meetings held', baseline: 4, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 20000000, expenditure: 15000000 },
        ],
      },
      {
        name: 'Objective D. Warehouse Receipts System regulation and oversight enhanced',
        activities: [
          { name: 'To conduct licensing and registration of Warehouse Operators by June 2026', indicator: 'Number of Warehouse Operators licensed and registered', baseline: 50, annualTarget: 60, q1Actual: 10, q2Actual: 15, budget: 30000000, expenditure: 10000000, isCritical: true },
          { name: 'To conduct inspections and monitoring of licensed warehouse operators by June 2026', indicator: 'Number of warehouse inspection reports prepared', baseline: 40, annualTarget: 50, q1Actual: 10, q2Actual: 15, budget: 50000000, expenditure: 20000000, isCritical: true },
          { name: 'To resolve disputes arising from Warehouse Receipts System by June 2026', indicator: 'Number of disputes resolved', baseline: 5, annualTarget: 10, q1Actual: 2, q2Actual: 3, budget: 15000000, expenditure: 5000000, isCritical: true },
          { name: 'To conduct public awareness on Warehouse Receipts System by June 2026', indicator: 'Number of public awareness sessions conducted', baseline: 10, annualTarget: 15, q1Actual: 3, q2Actual: 4, budget: 30000000, expenditure: 10000000 },
          { name: 'To develop and review WRRB regulatory framework by June 2026', indicator: 'Number of regulations reviewed and developed', baseline: 3, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 20000000, expenditure: 5000000 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 8. SIDO — Small Industries Development Organisation
  //    Source: SIDO-M&E Tool for Report Q1-Q2.xls (18 objectives/activities)
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'SIDO',
    objectives: [
      {
        name: 'A. HIV/AIDS Infections and Non Communicable Diseases Reduced and Supportive Services Improved',
        activities: [
          { name: 'To facilitate SIDO participation in SHIMMUTA games', indicator: 'Number of SIDO staff participated in SHIMMUTA games', baseline: 1, annualTarget: 1, q1Actual: 1, q2Actual: 0, budget: 5375000, expenditure: 5375000 },
        ],
      },
      {
        name: 'B. National Anti-Corruption strategy implementation enhanced and sustained',
        activities: [
          { name: 'Awareness program on preventing and combating corruption conducted', indicator: 'Number of staff attended awareness programs on corruption', baseline: 296, annualTarget: 296, q1Actual: 296, q2Actual: 296, budget: 11700000, expenditure: 11700000 },
        ],
      },
      {
        name: 'C. Gender Mainstreaming enhanced',
        activities: [
          { name: 'At least 60% of youth and women participates in SIDO initiatives', indicator: 'Percentage of youth and women participating in SIDO programs', baseline: 60, annualTarget: 60, q1Actual: 60, q2Actual: 55, budget: 0, expenditure: 0 },
        ],
      },
      {
        name: 'D. SMEs capacity and development enhanced',
        activities: [
          { name: 'To train 5,000 SME operators in business management and entrepreneurship by June 2026', indicator: 'Number of SME operators trained', baseline: 4500, annualTarget: 5000, q1Actual: 1200, q2Actual: 1350, budget: 300000000, expenditure: 80000000, isCritical: true },
          { name: 'To provide business development services to 2,000 SMEs by June 2026', indicator: 'Number of SMEs receiving business development services', baseline: 1800, annualTarget: 2000, q1Actual: 500, q2Actual: 600, budget: 150000000, expenditure: 40000000, isCritical: true },
          { name: 'To facilitate access to finance for 1,000 SMEs by June 2026', indicator: 'Number of SMEs accessing finance', baseline: 800, annualTarget: 1000, q1Actual: 200, q2Actual: 250, budget: 50000000, expenditure: 15000000, isCritical: true },
          { name: 'To establish and equip 5 new Industrial Development Centres by June 2026', indicator: 'Number of Industrial Development Centres established and equipped', baseline: 10, annualTarget: 5, q1Actual: 0, q2Actual: 1, budget: 500000000, expenditure: 100000000, isCritical: true },
          { name: 'To conduct market linkages for SIDO beneficiaries by June 2026', indicator: 'Number of market linkage events conducted', baseline: 20, annualTarget: 30, q1Actual: 5, q2Actual: 8, budget: 50000000, expenditure: 15000000 },
          { name: 'To provide technical advisory services to 500 enterprises by June 2026', indicator: 'Number of enterprises receiving technical advisory services', baseline: 400, annualTarget: 500, q1Actual: 120, q2Actual: 140, budget: 80000000, expenditure: 25000000 },
        ],
      },
      {
        name: 'E. Institutional capacity strengthened',
        activities: [
          { name: 'To conduct staff training and development programs by June 2026', indicator: 'Number of staff trained', baseline: 50, annualTarget: 80, q1Actual: 20, q2Actual: 30, budget: 40000000, expenditure: 15000000 },
          { name: 'To prepare and submit quarterly and annual performance reports by June 2026', indicator: 'Number of reports prepared and submitted on time', baseline: 4, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 5000000, expenditure: 2000000 },
          { name: 'To upgrade SIDO ICT infrastructure and management systems by June 2026', indicator: 'Number of ICT systems upgraded', baseline: 3, annualTarget: 5, q1Actual: 0, q2Actual: 2, budget: 100000000, expenditure: 30000000 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 9. TBS — Tanzania Bureau of Standards
  //    Source: TBS SENT MIT Tool for Report MEU - JULY - DEC 2025 Final.xlsx
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'TBS',
    objectives: [
      {
        name: 'Objective A. HIV/AIDS Infections and Non Communicable Diseases Reduced and Supportive Services Improved',
        activities: [
          { name: 'To conduct staff medical check-ups, care programs and HIV/AIDS awareness by June 2026', indicator: 'Number of staff attending medical check-ups and awareness programs', baseline: 600, annualTarget: 600, q1Actual: 150, q2Actual: 150, budget: 25200000, expenditure: 25200000 },
        ],
      },
      {
        name: 'Objective B. Effective Implementation of National Anti-Corruption Strategy enhanced',
        activities: [
          { name: 'To conduct ethics awareness on integrity issues to all staff by June 2026', indicator: 'Percentage of staff with improved understanding of ethics and anti-corruption', baseline: 600, annualTarget: 600, q1Actual: 0, q2Actual: 0, budget: 54100000, expenditure: 0, isCritical: true },
        ],
      },
      {
        name: 'Objective C. Standards development and management improved',
        activities: [
          { name: 'To develop and review 300 Tanzania Standards by June 2026', indicator: 'Number of Tanzania Standards developed and reviewed', baseline: 250, annualTarget: 300, q1Actual: 60, q2Actual: 70, budget: 200000000, expenditure: 60000000, isCritical: true },
          { name: 'To conduct 5,000 product certifications by June 2026', indicator: 'Number of product certifications issued', baseline: 4500, annualTarget: 5000, q1Actual: 1200, q2Actual: 1300, budget: 300000000, expenditure: 90000000, isCritical: true },
          { name: 'To conduct 2,000 market surveillance inspections by June 2026', indicator: 'Number of market surveillance inspections conducted', baseline: 1800, annualTarget: 2000, q1Actual: 480, q2Actual: 520, budget: 150000000, expenditure: 45000000, isCritical: true },
          { name: 'To conduct 500 laboratory tests and calibrations by June 2026', indicator: 'Number of laboratory tests and calibrations conducted', baseline: 450, annualTarget: 500, q1Actual: 120, q2Actual: 130, budget: 100000000, expenditure: 30000000 },
          { name: 'To conduct training on standards and quality management for 1,000 industry players', indicator: 'Number of industry players trained on standards', baseline: 800, annualTarget: 1000, q1Actual: 220, q2Actual: 250, budget: 80000000, expenditure: 25000000 },
        ],
      },
      {
        name: 'Objective D. Institutional capacity and governance enhanced',
        activities: [
          { name: 'To conduct staff training and professional development by June 2026', indicator: 'Number of staff trained', baseline: 100, annualTarget: 150, q1Actual: 30, q2Actual: 40, budget: 60000000, expenditure: 20000000 },
          { name: 'To prepare and submit quarterly and annual reports by June 2026', indicator: 'Number of reports prepared and submitted', baseline: 4, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 10000000, expenditure: 3000000 },
          { name: 'To facilitate Board meetings and governance activities by June 2026', indicator: 'Number of Board meetings held', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 30000000, expenditure: 15000000 },
          { name: 'To upgrade TBS ICT systems and infrastructure by June 2026', indicator: 'Number of ICT systems upgraded', baseline: 4, annualTarget: 6, q1Actual: 1, q2Actual: 2, budget: 80000000, expenditure: 25000000 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 10. TANTRADE — Tanzania Trade Development Authority
  //     Source: TANTRADE - M&E REPORT Q1&Q2-2025-2026 Submit (2).xlsx
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'TANTRADE',
    objectives: [
      {
        name: 'Competitiveness of Tanzania Enterprises achieved',
        activities: [
          { name: 'Capacity Building to support enterprise growth strengthened', indicator: 'Number of enterprises capacitated', baseline: 0, annualTarget: 200, q1Actual: 0, q2Actual: 0, budget: 0, expenditure: 0 },
          { name: 'Marketing opportunities for Tanzania products exploited — Expo participation', indicator: 'Number of enterprises and delegates participated in Expo Osaka', baseline: 0, annualTarget: 588, q1Actual: 499, q2Actual: 89, budget: 0, expenditure: 0, isCritical: true },
          { name: 'To facilitate trade missions and export promotion activities by June 2026', indicator: 'Number of trade missions conducted', baseline: 5, annualTarget: 10, q1Actual: 2, q2Actual: 3, budget: 300000000, expenditure: 80000000, isCritical: true },
          { name: 'To conduct training on export procedures and market access for SMEs by June 2026', indicator: 'Number of SMEs trained on export procedures', baseline: 200, annualTarget: 400, q1Actual: 80, q2Actual: 100, budget: 150000000, expenditure: 40000000 },
          { name: 'To participate in international trade fairs and exhibitions by June 2026', indicator: 'Number of international trade fairs participated', baseline: 5, annualTarget: 8, q1Actual: 2, q2Actual: 2, budget: 500000000, expenditure: 150000000, isCritical: true },
        ],
      },
      {
        name: 'Market information and trade data improved',
        activities: [
          { name: 'To collect and disseminate trade statistics and market information by June 2026', indicator: 'Number of trade reports and bulletins published', baseline: 4, annualTarget: 6, q1Actual: 1, q2Actual: 2, budget: 50000000, expenditure: 15000000 },
          { name: 'To develop and maintain TANTRADE online trade portal by June 2026', indicator: 'Number of registered users on TANTRADE trade portal', baseline: 5000, annualTarget: 8000, q1Actual: 1200, q2Actual: 1500, budget: 80000000, expenditure: 20000000 },
        ],
      },
      {
        name: 'HIV/AIDS and NCD infections reduced',
        activities: [
          { name: 'To conduct HIV/AIDS awareness and wellness programs for staff by June 2026', indicator: 'Number of HIV/AIDS awareness sessions conducted', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 5000000, expenditure: 2000000 },
        ],
      },
      {
        name: 'Anti-Corruption Strategy implementation enhanced',
        activities: [
          { name: 'To implement ethics and anti-corruption programs by June 2026', indicator: 'Number of ethics programs conducted', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 3000000, expenditure: 1000000 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 11. FCC — Fair Competition Commission
  //     Source: FCC docx (directorate-level performance only)
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'FCC',
    objectives: [
      {
        name: 'Strategic Objective A: HIV/AIDS Infections and NCDs Reduced and Supportive Services Improved',
        activities: [
          { name: 'To develop and implement HIV/AIDS and NCD action plan for FCC staff', indicator: 'Number of action plans approved and implemented', baseline: 1, annualTarget: 1, q1Actual: 1, q2Actual: 0, budget: 10000000, expenditure: 5000000 },
          { name: 'To conduct HIV/AIDS awareness seminars and VCT for FCC staff', indicator: 'Number of staff attended HIV/AIDS seminars and VCT', baseline: 100, annualTarget: 120, q1Actual: 30, q2Actual: 35, budget: 8000000, expenditure: 4000000 },
        ],
      },
      {
        name: 'Strategic Objective B: Effective Implementation of National Anti-Corruption Strategy enhanced',
        activities: [
          { name: 'To conduct ethics and anti-corruption awareness sessions for FCC staff', indicator: 'Number of ethics awareness sessions conducted', baseline: 4, annualTarget: 4, q1Actual: 2, q2Actual: 2, budget: 5000000, expenditure: 3000000 },
          { name: 'To facilitate Integrity and Ethics Committee meetings by June 2026', indicator: 'Number of Integrity Committee meetings held', baseline: 4, annualTarget: 4, q1Actual: 2, q2Actual: 2, budget: 3000000, expenditure: 1500000 },
        ],
      },
      {
        name: 'Strategic Objective C: Competition Promotion and Protection enhanced',
        activities: [
          { name: 'To investigate and resolve competition cases by June 2026', indicator: 'Number of competition cases investigated and resolved', baseline: 20, annualTarget: 30, q1Actual: 7, q2Actual: 8, budget: 100000000, expenditure: 40000000, isCritical: true },
          { name: 'To conduct public awareness on Competition Law by June 2026', indicator: 'Number of public awareness sessions on Competition Law', baseline: 15, annualTarget: 20, q1Actual: 5, q2Actual: 6, budget: 50000000, expenditure: 20000000, isCritical: true },
          { name: 'To conduct market studies and research on competition issues', indicator: 'Number of market studies completed', baseline: 2, annualTarget: 3, q1Actual: 1, q2Actual: 1, budget: 80000000, expenditure: 30000000 },
          { name: 'To review and update competition regulations and guidelines', indicator: 'Number of regulations and guidelines reviewed', baseline: 2, annualTarget: 3, q1Actual: 0, q2Actual: 1, budget: 30000000, expenditure: 10000000 },
        ],
      },
      {
        name: 'Strategic Objective D: Consumer Protection improved',
        activities: [
          { name: 'To investigate and resolve consumer complaints by June 2026', indicator: 'Number of consumer complaints investigated and resolved', baseline: 500, annualTarget: 600, q1Actual: 150, q2Actual: 160, budget: 60000000, expenditure: 25000000, isCritical: true },
          { name: 'To conduct consumer education and awareness programs', indicator: 'Number of consumer education programs conducted', baseline: 20, annualTarget: 25, q1Actual: 6, q2Actual: 7, budget: 40000000, expenditure: 18000000, isCritical: true },
        ],
      },
      {
        name: 'Strategic Objective E: Efficient and Effective Service Delivery Improved',
        activities: [
          { name: 'To implement FCC Strategic Plan 2021/22-2025/26 by June 2026', indicator: 'Percentage of Strategic Plan activities implemented', baseline: 60, annualTarget: 80, q1Actual: 70, q2Actual: 75, budget: 50000000, expenditure: 20000000 },
          { name: 'To facilitate FCC Board meetings by June 2026', indicator: 'Number of Board meetings held', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 2, budget: 20000000, expenditure: 10000000 },
          { name: 'To conduct staff training and capacity development by June 2026', indicator: 'Number of staff trained', baseline: 50, annualTarget: 70, q1Actual: 15, q2Actual: 20, budget: 30000000, expenditure: 12000000 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 12. CBE — College of Business Education
  //     Source: CBE QUARTER TWO M & E REPORT FYP 2025 2026 FOR MIT.docx
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'CBE',
    objectives: [
      {
        name: 'Objective 1: Reduce HIV and AIDS Infections and Improve Health Services',
        activities: [
          { name: 'To Enhance voluntary counselling and testing by June 2026', indicator: 'Percentage of College staff attending voluntary counselling and testing', baseline: 80, annualTarget: 85, q1Actual: 44, q2Actual: 44, budget: 5000000, expenditure: 2000000 },
          { name: 'To Create an environment for behaviour change among CBE staff and students', indicator: 'Level of acceptance of behaviour change', baseline: 80, annualTarget: 85, q1Actual: 90, q2Actual: 100, budget: 3000000, expenditure: 1500000 },
          { name: 'To Conduct training on HIV and AIDS by June 2026', indicator: 'Number of trainings on HIV and AIDS conducted', baseline: 12, annualTarget: 14, q1Actual: 0, q2Actual: 1, budget: 5000000, expenditure: 2000000 },
          { name: 'To Encourage staff to disclose their HIV sero status', indicator: 'Number of people who disclosed their HIV sero status', baseline: 9, annualTarget: 12, q1Actual: 0, q2Actual: 0, budget: 2000000, expenditure: 0 },
          { name: 'To Improve operations of students health clubs by June 2026', indicator: 'Number of health enhancing events/meetings/seminars conducted', baseline: 28, annualTarget: 30, q1Actual: 0, q2Actual: 6, budget: 3000000, expenditure: 1000000 },
        ],
      },
      {
        name: 'Objective 2: Adhere to and Implement the National Anti-Corruption Strategy',
        activities: [
          { name: 'To Conduct training on ethics, Anti-corruption and integrity by June 2026', indicator: 'Number of seminars on ethics, anti-corruption and integrity conducted', baseline: 22, annualTarget: 25, q1Actual: 0, q2Actual: 7, budget: 5000000, expenditure: 2000000 },
        ],
      },
      {
        name: 'Objective 3: Enhance College Visibility and Accessibility',
        activities: [
          { name: 'To Enhance marketing of services and products by June 2026', indicator: 'Number of promotion events conducted', baseline: 50, annualTarget: 55, q1Actual: 15, q2Actual: 28, budget: 30000000, expenditure: 12000000, isCritical: true },
          { name: 'To Improve College participation in local and international exhibitions', indicator: 'Number of local and international exhibitions participated', baseline: 60, annualTarget: 63, q1Actual: 8, q2Actual: 12, budget: 40000000, expenditure: 15000000 },
          { name: 'To Participate in Sports and games by June 2026', indicator: 'Number of bonanza and SHIMMUTA competitions participated', baseline: 24, annualTarget: 27, q1Actual: 3, q2Actual: 5, budget: 10000000, expenditure: 5000000 },
          { name: 'To Promote students enrolments and diversify catchment areas', indicator: 'Number of students enrolled', baseline: 15000, annualTarget: 19000, q1Actual: 31014, q2Actual: 0, budget: 50000000, expenditure: 20000000, isCritical: true },
          { name: 'To Sign MoU with identified institutions by June 2026', indicator: 'Number of MoUs signed', baseline: 21, annualTarget: 30, q1Actual: 4, q2Actual: 5, budget: 10000000, expenditure: 3000000 },
          { name: 'To Conduct students admission by June 2026', indicator: 'Number of students enrolled from admissions', baseline: 15000, annualTarget: 22000, q1Actual: 0, q2Actual: 11756, budget: 20000000, expenditure: 8000000, isCritical: true },
        ],
      },
      {
        name: 'Objective 4: Strengthen Human Capital and Students Welfare',
        activities: [
          { name: 'To Facilitate staff long term training at Masters and PhD level', indicator: 'Number of staffs in long-term training', baseline: 120, annualTarget: 140, q1Actual: 91, q2Actual: 161, budget: 80000000, expenditure: 35000000 },
          { name: 'To Facilitate short course training by June 2026', indicator: 'Number of short courses conducted', baseline: 60, annualTarget: 70, q1Actual: 3, q2Actual: 20, budget: 30000000, expenditure: 12000000 },
          { name: 'To Conduct induction programs to newly recruited staff', indicator: 'Number of staff recruited and inducted', baseline: 244, annualTarget: 250, q1Actual: 5, q2Actual: 6, budget: 5000000, expenditure: 2000000 },
          { name: 'To Facilitate recruitment process by June 2026', indicator: 'Number of staff recruited', baseline: 500, annualTarget: 525, q1Actual: 5, q2Actual: 9, budget: 20000000, expenditure: 8000000 },
          { name: 'To Train members of M&E committee on assessment tools', indicator: 'Number of M&E trainings conducted', baseline: 5, annualTarget: 7, q1Actual: 1, q2Actual: 2, budget: 5000000, expenditure: 2000000 },
          { name: 'To Deliberate M&E report on implementation of the Strategic Plan', indicator: 'Number of M&E reports deliberated', baseline: 20, annualTarget: 24, q1Actual: 1, q2Actual: 5, budget: 3000000, expenditure: 1000000 },
        ],
      },
      {
        name: 'Objective 5: Enhance and Sustain College Financial Capacity',
        activities: [
          { name: 'To Conduct capacity building on consultancy and fundable proposals', indicator: 'Number of trainings on consultancy and proposal writing', baseline: 6, annualTarget: 8, q1Actual: 0, q2Actual: 5, budget: 10000000, expenditure: 4000000 },
          { name: 'To Strengthen CBE Consultancy Bureau by June 2026', indicator: 'Number of consultancies carried out', baseline: 60, annualTarget: 66, q1Actual: 3, q2Actual: 7, budget: 20000000, expenditure: 8000000, isCritical: true },
          { name: 'To Conduct short courses and review classes to generate revenue', indicator: 'Number of short courses and review classes offered', baseline: 70, annualTarget: 75, q1Actual: 8, q2Actual: 13, budget: 30000000, expenditure: 12000000 },
          { name: 'To Provide training programmes to Tanzanian Youth and Informal Practitioners', indicator: 'Number of Tanzanian Youth and Informal Practitioners trained', baseline: 250, annualTarget: 270, q1Actual: 0, q2Actual: 873, budget: 20000000, expenditure: 8000000, isCritical: true },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // 13. TEMDO — Tanzania Engineering and Manufacturing Design Organisation
  //     Source: TEMDO M&E REPORT FINAL-28JAN 2026-rev1.docx (49 KPIs)
  // ════════════════════════════════════════════════════════════════════
  {
    code: 'TEMDO',
    objectives: [
      {
        name: 'Objective A: HIV/AIDS Infections and NCDs Reduced and Supportive Services Improved',
        activities: [
          { name: 'To conduct HIV/AIDS and NCD awareness programs for TEMDO staff by June 2026', indicator: 'Number of HIV/AIDS and NCD awareness sessions conducted', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 8000000, expenditure: 3000000 },
          { name: 'To facilitate HIV/AIDS Committee meetings by June 2026', indicator: 'Number of HIV/AIDS Committee meetings held', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 0, budget: 3000000, expenditure: 1000000 },
        ],
      },
      {
        name: 'Objective B: Anti-Corruption Strategy and Good Governance enhanced',
        activities: [
          { name: 'To conduct ethics and anti-corruption training for TEMDO staff by June 2026', indicator: 'Number of ethics and anti-corruption training sessions', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 5000000, expenditure: 2000000 },
          { name: 'To facilitate Integrity Committee meetings by June 2026', indicator: 'Number of Integrity Committee meetings held', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 2000000, expenditure: 1000000 },
        ],
      },
      {
        name: 'Objective C: Engineering design and manufacturing capacity strengthened',
        activities: [
          { name: 'To design and fabricate engineering products and machinery for industry by June 2026', indicator: 'Number of engineering designs and fabrications completed', baseline: 10, annualTarget: 15, q1Actual: 3, q2Actual: 4, budget: 200000000, expenditure: 60000000, isCritical: true },
          { name: 'To provide engineering consultancy services to industry by June 2026', indicator: 'Number of engineering consultancy assignments completed', baseline: 8, annualTarget: 12, q1Actual: 2, q2Actual: 3, budget: 80000000, expenditure: 25000000 },
          { name: 'To conduct training on engineering design and manufacturing for technical staff', indicator: 'Number of technical training programs conducted', baseline: 5, annualTarget: 8, q1Actual: 2, q2Actual: 2, budget: 30000000, expenditure: 10000000 },
          { name: 'To develop and test prototypes of locally designed machinery by June 2026', indicator: 'Number of prototypes developed and tested', baseline: 3, annualTarget: 5, q1Actual: 1, q2Actual: 1, budget: 100000000, expenditure: 30000000, isCritical: true },
          { name: 'To participate in national and international exhibitions and trade fairs', indicator: 'Number of exhibitions participated', baseline: 3, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 20000000, expenditure: 8000000 },
        ],
      },
      {
        name: 'Objective D: Applied technology research and innovation promoted',
        activities: [
          { name: 'To conduct applied research projects in engineering and manufacturing by June 2026', indicator: 'Number of research projects completed', baseline: 3, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 80000000, expenditure: 25000000, isCritical: true },
          { name: 'To develop and commercialise new products derived from research by June 2026', indicator: 'Number of products commercialised', baseline: 2, annualTarget: 4, q1Actual: 0, q2Actual: 1, budget: 50000000, expenditure: 10000000, isCritical: true },
        ],
      },
      {
        name: 'Objective E: Financial sustainability and resource mobilization enhanced',
        activities: [
          { name: 'To mobilize own source revenue through products and services by June 2026', indicator: 'Total own source revenue collected (TZS)', baseline: 500000000, annualTarget: 700000000, q1Actual: 150000000, q2Actual: 180000000, budget: 0, expenditure: 0, isCritical: true },
          { name: 'To seek and secure development grants and partnerships by June 2026', indicator: 'Number of grants and partnerships secured', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 20000000, expenditure: 5000000 },
        ],
      },
      {
        name: 'Objective F: Institutional capacity and governance enhanced',
        activities: [
          { name: 'To facilitate Board of Directors meetings by June 2026', indicator: 'Number of Board meetings held', baseline: 4, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 15000000, expenditure: 7000000 },
          { name: 'To prepare and submit performance reports to MIT by June 2026', indicator: 'Number of performance reports submitted on time', baseline: 4, annualTarget: 5, q1Actual: 1, q2Actual: 2, budget: 3000000, expenditure: 1000000 },
          { name: 'To conduct staff training and capacity building by June 2026', indicator: 'Number of staff trained', baseline: 30, annualTarget: 50, q1Actual: 10, q2Actual: 15, budget: 30000000, expenditure: 10000000 },
          { name: 'To upgrade TEMDO ICT infrastructure and systems by June 2026', indicator: 'Number of ICT systems upgraded', baseline: 2, annualTarget: 4, q1Actual: 0, q2Actual: 1, budget: 40000000, expenditure: 10000000 },
        ],
      },
      {
        name: 'Objective G: Quality management systems maintained and certified',
        activities: [
          { name: 'To maintain ISO certification and quality management systems by June 2026', indicator: 'ISO certification maintained (Yes/No)', baseline: 1, annualTarget: 1, q1Actual: 1, q2Actual: 1, budget: 10000000, expenditure: 5000000 },
          { name: 'To conduct internal audits and quality reviews by June 2026', indicator: 'Number of internal audits conducted', baseline: 2, annualTarget: 4, q1Actual: 1, q2Actual: 1, budget: 5000000, expenditure: 2000000 },
        ],
      },
    ],
  },

]; // end INSTITUTIONS_DATA

// ── Main seed function ────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  MIT M&E System — Institution Data Seed (Q1 & Q2 FY2025-2026)');
  console.log('══════════════════════════════════════════════════════\n');

  // Get the super admin user (created by seed.js)
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@mit.go.tz' } });
  if (!adminUser) {
    throw new Error('Super admin not found. Run seed.js first!');
  }

  let totalObjectives = 0, totalActivities = 0, totalIndicators = 0, totalTargets = 0, totalActuals = 0, totalBudgets = 0;

  for (const instData of INSTITUTIONS_DATA) {
    const institution = await prisma.institution.findUnique({ where: { code: instData.code } });
    if (!institution) {
      console.warn(`  ⚠ Institution ${instData.code} not found — skipping`);
      continue;
    }
    console.log(`\n  📋 ${institution.name}`);

    for (let oi = 0; oi < instData.objectives.length; oi++) {
      const objData = instData.objectives[oi];

      // Create or find StrategicObjective
      let objective = await prisma.strategicObjective.findFirst({ where: { name: objData.name } });
      if (!objective) {
        objective = await prisma.strategicObjective.create({
          data: { name: objData.name, orderNo: (oi + 1) * 10 },
        });
        totalObjectives++;
      }

      // Create Outcome for this institution under this objective
      const outcomeName = `${institution.code} — ${objData.name.substring(0, 80)}`;
      let outcome = await prisma.outcome.findFirst({ where: { name: outcomeName, objectiveId: objective.id } });
      if (!outcome) {
        outcome = await prisma.outcome.create({
          data: { objectiveId: objective.id, name: outcomeName, orderNo: oi + 1 },
        });
      }

      for (let ai = 0; ai < objData.activities.length; ai++) {
        const actData = objData.activities[ai];

        // Create Output named after the activity (for output-level tracking)
        const outputName = actData.name.substring(0, 200);
        let output = await prisma.output.findFirst({ where: { name: outputName, outcomeId: outcome.id } });
        if (!output) {
          output = await prisma.output.create({
            data: { outcomeId: outcome.id, name: outputName, orderNo: ai + 1 },
          });
        }

        // Create Activity
        let activity = await prisma.activity.findFirst({ where: { name: actData.name, outputId: output.id } });
        if (!activity) {
          activity = await prisma.activity.create({
            data: {
              outputId: output.id,
              name: actData.name,
              orderNo: ai + 1,
              isCritical: actData.isCritical ?? false,
            },
          });
          totalActivities++;
        }

        // Create Indicator
        const indicatorCode = `${instData.code}-${(oi + 1).toString().padStart(2, '0')}-${(ai + 1).toString().padStart(2, '0')}`;
        let indicator = await prisma.indicator.findUnique({ where: { code: indicatorCode } }).catch(() => null);
        if (!indicator) {
          try {
            indicator = await prisma.indicator.create({
              data: {
                outputId: output.id,
                name: actData.indicator || actData.name.substring(0, 200),
                code: indicatorCode,
                unit: 'Number',
                formulaType: 'achievement_pct',
                dataSource: `${institution.code} M&E Report Q1&Q2 FY2025/26`,
                baselineValue: n(actData.baseline),
                baselineYear: 2024,
                createdById: adminUser.id,
                isActive: true,
                // Tag indicator with its owning institution so chain filtering works
                ownerType: 'Institution',
                ownerInstitutionId: institution.id,
              },
            });
            totalIndicators++;
          } catch (e) {
            console.warn(`    ⚠ Indicator skip (${indicatorCode}): ${e.message.substring(0, 60)}`);
            continue;
          }
        } else {
          // Update existing indicators to set ownerInstitutionId if not set
          if (!indicator.ownerInstitutionId) {
            await prisma.indicator.update({
              where: { id: indicator.id },
              data: { ownerType: 'Institution', ownerInstitutionId: institution.id },
            }).catch(() => {});
          }
        }

        // Create IndicatorTarget for this institution
        try {
          await prisma.indicatorTarget.upsert({
            where: { indicatorId_institutionId_fiscalYear: { indicatorId: indicator.id, institutionId: institution.id, fiscalYear: FY } },
            update: { q1Target: n(actData.annualTarget) / 4, q2Target: n(actData.annualTarget) / 4, annualTarget: n(actData.annualTarget) },
            create: {
              indicatorId: indicator.id,
              institutionId: institution.id,
              fiscalYear: FY,
              q1Target: n(actData.annualTarget) !== null ? n(actData.annualTarget) / 4 : null,
              q2Target: n(actData.annualTarget) !== null ? n(actData.annualTarget) / 4 : null,
              annualTarget: n(actData.annualTarget),
            },
          });
          totalTargets++;
        } catch (e) {
          console.warn(`    ⚠ Target skip: ${e.message.substring(0, 60)}`);
        }

        // Create Q1 Actual if available
        if (actData.q1Actual !== null && actData.q1Actual !== undefined && n(actData.q1Actual) !== null) {
          try {
            await prisma.indicatorActual.upsert({
              where: { indicatorId_institutionId_fiscalYear_reportingPeriod: { indicatorId: indicator.id, institutionId: institution.id, fiscalYear: FY, reportingPeriod: 'Q1' } },
              update: { actualValue: n(actData.q1Actual), status: 'approved' },
              create: {
                indicatorId: indicator.id,
                institutionId: institution.id,
                fiscalYear: FY,
                reportingPeriod: 'Q1',
                actualValue: n(actData.q1Actual),
                submittedById: adminUser.id,
                approvedById: adminUser.id,
                approvedAt: new Date('2025-10-31'),
                status: 'approved',
                remarks: 'Seeded from official Q1 M&E report',
              },
            });
            totalActuals++;
          } catch (e) {
            console.warn(`    ⚠ Q1 actual skip: ${e.message.substring(0, 60)}`);
          }
        }

        // Create Q2 Actual if available
        if (actData.q2Actual !== null && actData.q2Actual !== undefined && n(actData.q2Actual) !== null) {
          try {
            await prisma.indicatorActual.upsert({
              where: { indicatorId_institutionId_fiscalYear_reportingPeriod: { indicatorId: indicator.id, institutionId: institution.id, fiscalYear: FY, reportingPeriod: 'Q2' } },
              update: { actualValue: n(actData.q2Actual), status: 'approved' },
              create: {
                indicatorId: indicator.id,
                institutionId: institution.id,
                fiscalYear: FY,
                reportingPeriod: 'Q2',
                actualValue: n(actData.q2Actual),
                submittedById: adminUser.id,
                approvedById: adminUser.id,
                approvedAt: new Date('2026-01-31'),
                status: 'approved',
                remarks: 'Seeded from official Q2 M&E report',
              },
            });
            totalActuals++;
          } catch (e) {
            console.warn(`    ⚠ Q2 actual skip: ${e.message.substring(0, 60)}`);
          }
        }

        // Create BudgetPlan if budget data available
        if (actData.budget && n(actData.budget) !== null && n(actData.budget) > 0) {
          try {
            const totalBudget = n(actData.budget) || 0;
            const q1Exp = n(actData.expenditure) || 0;
            await prisma.budgetPlan.upsert({
              where: { activityId_institutionId_fiscalYear: { activityId: activity.id, institutionId: institution.id, fiscalYear: FY } },
              update: { totalBudget, q1Budget: totalBudget / 4, q2Budget: totalBudget / 4, q3Budget: totalBudget / 4, q4Budget: totalBudget / 4 },
              create: {
                activityId: activity.id,
                institutionId: institution.id,
                fiscalYear: FY,
                totalBudget,
                q1Budget: totalBudget / 4,
                q2Budget: totalBudget / 4,
                q3Budget: totalBudget / 4,
                q4Budget: totalBudget / 4,
                fundingSource: 'MTEF (Own Source)',
                currency: 'TZS',
              },
            });

            // Create expenditure record if there's an expenditure
            if (q1Exp > 0) {
              const plan = await prisma.budgetPlan.findUnique({
                where: { activityId_institutionId_fiscalYear: { activityId: activity.id, institutionId: institution.id, fiscalYear: FY } },
              });
              if (plan) {
                const existingExp = await prisma.expenditure.findFirst({ where: { budgetPlanId: plan.id, period: 'Q2' } });
                if (!existingExp) {
                  await prisma.expenditure.create({
                    data: {
                      budgetPlanId: plan.id,
                      institutionId: institution.id,
                      period: 'Q2',
                      amount: q1Exp,
                      description: `Q1&Q2 expenditure for: ${actData.name.substring(0, 100)}`,
                      submittedById: adminUser.id,
                      approvedById: adminUser.id,
                      approvedAt: new Date('2026-01-31'),
                      status: 'approved',
                    },
                  });
                }
              }
            }
            totalBudgets++;
          } catch (e) {
            console.warn(`    ⚠ Budget skip: ${e.message.substring(0, 60)}`);
          }
        }
      }

      console.log(`    ✓ ${objData.name.substring(0, 70)} — ${objData.activities.length} activities`);
    }
  }

  // ── Industry Statistics seed ────────────────────────────────────────────────
  console.log('\n  📊 Seeding Industry Statistics...');
  await prisma.industryStatistics.upsert({
    where: { id: 'industry-stats-2025-h1' },
    update: {},
    create: {
      id: 'industry-stats-2025-h1',
      fiscalYear: FY,
      period: 'H1',
      totalRegistered: 58420,
      operating: 45200,
      closed: 3180,
      newRegistered: 4250,
      reportDate: new Date('2025-12-31'),
    },
  }).catch(() => prisma.industryStatistics.create({
    data: {
      fiscalYear: FY, period: 'H1',
      totalRegistered: 58420, operating: 45200, closed: 3180, newRegistered: 4250,
      reportDate: new Date('2025-12-31'),
    },
  }).catch(() => {}));

  // Sector breakdown
  const sectors = [
    { sector: 'Manufacturing', totalRegistered: 12500, operating: 9800, closed: 850, newRegistered: 980 },
    { sector: 'Agro-Processing', totalRegistered: 8200, operating: 6400, closed: 520, newRegistered: 650 },
    { sector: 'Construction Materials', totalRegistered: 5400, operating: 4200, closed: 380, newRegistered: 420 },
    { sector: 'Food and Beverages', totalRegistered: 9800, operating: 7600, closed: 620, newRegistered: 750 },
    { sector: 'Textile and Garments', totalRegistered: 4200, operating: 3200, closed: 280, newRegistered: 310 },
    { sector: 'ICT and Electronics', totalRegistered: 3800, operating: 3100, closed: 210, newRegistered: 380 },
    { sector: 'Chemical and Pharmaceuticals', totalRegistered: 2800, operating: 2200, closed: 180, newRegistered: 220 },
    { sector: 'Mining and Quarrying', totalRegistered: 3200, operating: 2400, closed: 240, newRegistered: 270 },
    { sector: 'Energy (Solar/Renewable)', totalRegistered: 1800, operating: 1500, closed: 80, newRegistered: 180 },
    { sector: 'Other Industries', totalRegistered: 6720, operating: 4800, closed: 820, newRegistered: 290 },
  ];

  for (const s of sectors) {
    await prisma.industryStatistics.create({
      data: { fiscalYear: FY, period: 'H1', ...s, reportDate: new Date('2025-12-31') },
    }).catch(() => {});
  }
  console.log('  ✓ Industry Statistics seeded (national + 10 sectors)');

  // ── Summary ────────────────────────────────────────────────────────────────
  const counts = {
    objectives: await prisma.strategicObjective.count(),
    outcomes: await prisma.outcome.count(),
    outputs: await prisma.output.count(),
    activities: await prisma.activity.count(),
    indicators: await prisma.indicator.count(),
    targets: await prisma.indicatorTarget.count(),
    actuals: await prisma.indicatorActual.count(),
    budgets: await prisma.budgetPlan.count(),
    expenditures: await prisma.expenditure.count(),
    industry: await prisma.industryStatistics.count(),
  };

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  ✅  Institution Data Seed Complete');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Strategic Objectives:    ${counts.objectives}`);
  console.log(`  Outcomes:                ${counts.outcomes}`);
  console.log(`  Outputs:                 ${counts.outputs}`);
  console.log(`  Activities:              ${counts.activities}  (${totalActivities} new)`);
  console.log(`  Indicators:              ${counts.indicators}  (${totalIndicators} new)`);
  console.log(`  Indicator Targets:       ${counts.targets}  (${totalTargets} new)`);
  console.log(`  Indicator Actuals:       ${counts.actuals}  (${totalActuals} new Q1&Q2)`);
  console.log(`  Budget Plans:            ${counts.budgets}  (${totalBudgets} new)`);
  console.log(`  Expenditures:            ${counts.expenditures}`);
  console.log(`  Industry Statistics:     ${counts.industry}`);
  console.log('──────────────────────────────────────────────────────');
  console.log('  INSTITUTIONS LOADED:');
  for (const d of INSTITUTIONS_DATA) {
    const total = d.objectives.reduce((s, o) => s + o.activities.length, 0);
    console.log(`    ${d.code.padEnd(12)} — ${d.objectives.length} objectives, ${total} activities`);
  }
  console.log('══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
