const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── INSTITUTIONS ────────────────────────────────────────────────────────────
const institutions = [
  { name: 'Ministry of Industry and Trade (HQ)', code: 'MIT-HQ', region: 'Dodoma' },
  { name: 'Business Registrations and Licensing Agency (BRELA)', code: 'BRELA', region: 'Dar es Salaam' },
  { name: 'Centre for Agricultural Mechanisation and Rural Technology (CAMARTEC)', code: 'CAMARTEC', region: 'Arusha' },
  { name: 'College of Business Education (CBE)', code: 'CBE', region: 'Dar es Salaam' },
  { name: 'Fair Competition Commission (FCC)', code: 'FCC', region: 'Dar es Salaam' },
  { name: 'Fair Competition Tribunal (FCT)', code: 'FCT', region: 'Dar es Salaam' },
  { name: 'National Development Corporation (NDC)', code: 'NDC', region: 'Dar es Salaam' },
  { name: 'Small Industries Development Organisation (SIDO)', code: 'SIDO', region: 'Dar es Salaam' },
  { name: 'Tanzania Bureau of Standards (TBS)', code: 'TBS', region: 'Dar es Salaam' },
  { name: 'Tanzania Engineering and Manufacturing Design Organisation (TEMDO)', code: 'TEMDO', region: 'Arusha' },
  { name: 'Tanzania Industrial Research & Development Organisation (TIRDO)', code: 'TIRDO', region: 'Dar es Salaam' },
  { name: 'Tanzania Trade Development Authority (TANTRADE)', code: 'TANTRADE', region: 'Dar es Salaam' },
  { name: 'Weights and Measures Agency (WMA)', code: 'WMA', region: 'Dar es Salaam' },
  { name: 'Warehouse Receipts Regulatory Board (WRRB)', code: 'WRRB', region: 'Dar es Salaam' },
];

// ─── MIT DEPARTMENTS & UNITS (official MIT organizational structure) ─────────
// Based on MIT Q1&Q2 Performance Report FY 2025/26 (official 13 departments/units)
const mitDepartments = [
  // DAHRM — Department of Administration and Human Resource Management
  { name: 'Director - DAHRM',             email: 'dahrm.director@mit.go.tz',  role: 'admin',          deptCode: 'DAHRM' },
  { name: 'DAHRM HR Officer',              email: 'dahrm.officer@mit.go.tz',   role: 'data_collector', deptCode: 'DAHRM' },
  // DID — Department of Industrial Development
  { name: 'Director - DID',               email: 'did.director@mit.go.tz',    role: 'admin',          deptCode: 'DID' },
  { name: 'DID Industrial Officer',        email: 'did.officer@mit.go.tz',     role: 'data_collector', deptCode: 'DID' },
  // DPP — Department of Policy and Planning
  { name: 'Director - DPP',               email: 'dpp.director@mit.go.tz',    role: 'me_officer',     deptCode: 'DPP' },
  { name: 'DPP Planning Officer',          email: 'dpp.officer@mit.go.tz',     role: 'data_collector', deptCode: 'DPP' },
  // DTD — Department of Trade and Development
  { name: 'Director - DTD',               email: 'dtd.director@mit.go.tz',    role: 'admin',          deptCode: 'DTD' },
  { name: 'DTD Trade Officer',             email: 'dtd.officer@mit.go.tz',     role: 'data_collector', deptCode: 'DTD' },
  // DSME — Department of Small and Medium Enterprises
  { name: 'Director - DSME',              email: 'dsme.director@mit.go.tz',   role: 'admin',          deptCode: 'DSME' },
  { name: 'DSME SME Officer',              email: 'dsme.officer@mit.go.tz',    role: 'data_collector', deptCode: 'DSME' },
  // DTI — Department of Trade Integration
  { name: 'Director - DTI',               email: 'dti.director@mit.go.tz',    role: 'admin',          deptCode: 'DTI' },
  { name: 'DTI Integration Officer',       email: 'dti.officer@mit.go.tz',     role: 'data_collector', deptCode: 'DTI' },
  // FAU — Finance and Accounting Unit
  { name: 'Head of Finance - FAU',         email: 'fau.head@mit.go.tz',        role: 'viewer',         deptCode: 'FAU' },
  // PMU — Procurement Management Unit
  { name: 'Head of Procurement - PMU',     email: 'pmu.head@mit.go.tz',        role: 'viewer',         deptCode: 'PMU' },
  // LSU — Legal Service Unit
  { name: 'Head of Legal Services - LSU',  email: 'lsu.head@mit.go.tz',        role: 'viewer',         deptCode: 'LSU' },
  // ICTU — Information Communication and Technology Unit
  { name: 'Head of ICT - ICTU',            email: 'ictu.head@mit.go.tz',       role: 'viewer',         deptCode: 'ICTU' },
  // GCU — Government Communication Unit
  { name: 'Head of Communication - GCU',   email: 'gcu.head@mit.go.tz',        role: 'viewer',         deptCode: 'GCU' },
  // IAU — Internal Audit Unit
  { name: 'Chief Internal Auditor - IAU',  email: 'iau.head@mit.go.tz',        role: 'viewer',         deptCode: 'IAU' },
  // MEU — Monitoring and Evaluation Unit
  { name: 'Head of M&E - MEU',             email: 'meu.head@mit.go.tz',        role: 'me_officer',     deptCode: 'MEU' },
  { name: 'M&E Officer - MEU',             email: 'meu.officer@mit.go.tz',     role: 'me_officer',     deptCode: 'MEU' },
  { name: 'M&E Data Analyst - MEU',        email: 'meu.analyst@mit.go.tz',     role: 'data_collector', deptCode: 'MEU' },
];

// ─── AGENCY USERS ────────────────────────────────────────────────────────────
const agencyUsers = [
  { name: 'BRELA Administrator',     email: 'admin@brela.go.tz',         role: 'admin',          code: 'BRELA' },
  { name: 'BRELA M&E Officer',        email: 'me.officer@brela.go.tz',    role: 'me_officer',     code: 'BRELA' },
  { name: 'BRELA Data Officer',       email: 'data@brela.go.tz',          role: 'data_collector', code: 'BRELA' },
  { name: 'CAMARTEC Administrator',   email: 'admin@camartec.go.tz',      role: 'admin',          code: 'CAMARTEC' },
  { name: 'CAMARTEC M&E Officer',     email: 'me.officer@camartec.go.tz', role: 'me_officer',     code: 'CAMARTEC' },
  { name: 'CAMARTEC Data Officer',    email: 'data@camartec.go.tz',       role: 'data_collector', code: 'CAMARTEC' },
  { name: 'CBE Administrator',        email: 'admin@cbe.ac.tz',           role: 'admin',          code: 'CBE' },
  { name: 'CBE M&E Officer',          email: 'me.officer@cbe.ac.tz',      role: 'me_officer',     code: 'CBE' },
  { name: 'CBE Data Officer',         email: 'data@cbe.ac.tz',            role: 'data_collector', code: 'CBE' },
  { name: 'FCC Administrator',        email: 'admin@fcc.go.tz',           role: 'admin',          code: 'FCC' },
  { name: 'FCC M&E Officer',          email: 'me.officer@fcc.go.tz',      role: 'me_officer',     code: 'FCC' },
  { name: 'FCC Data Officer',         email: 'data@fcc.go.tz',            role: 'data_collector', code: 'FCC' },
  { name: 'FCT Administrator',        email: 'admin@fct.go.tz',           role: 'admin',          code: 'FCT' },
  { name: 'FCT M&E Officer',          email: 'me.officer@fct.go.tz',      role: 'me_officer',     code: 'FCT' },
  { name: 'FCT Data Officer',         email: 'data@fct.go.tz',            role: 'data_collector', code: 'FCT' },
  { name: 'NDC Administrator',        email: 'admin@ndc.go.tz',           role: 'admin',          code: 'NDC' },
  { name: 'NDC M&E Officer',          email: 'me.officer@ndc.go.tz',      role: 'me_officer',     code: 'NDC' },
  { name: 'NDC Data Officer',         email: 'data@ndc.go.tz',            role: 'data_collector', code: 'NDC' },
  { name: 'SIDO Administrator',       email: 'admin@sido.go.tz',          role: 'admin',          code: 'SIDO' },
  { name: 'SIDO M&E Officer',         email: 'me.officer@sido.go.tz',     role: 'me_officer',     code: 'SIDO' },
  { name: 'SIDO Data Officer',        email: 'data@sido.go.tz',           role: 'data_collector', code: 'SIDO' },
  { name: 'TBS Administrator',        email: 'admin@tbs.go.tz',           role: 'admin',          code: 'TBS' },
  { name: 'TBS M&E Officer',          email: 'me.officer@tbs.go.tz',      role: 'me_officer',     code: 'TBS' },
  { name: 'TBS Data Officer',         email: 'data@tbs.go.tz',            role: 'data_collector', code: 'TBS' },
  { name: 'TEMDO Administrator',      email: 'admin@temdo.go.tz',         role: 'admin',          code: 'TEMDO' },
  { name: 'TEMDO M&E Officer',        email: 'me.officer@temdo.go.tz',    role: 'me_officer',     code: 'TEMDO' },
  { name: 'TEMDO Data Officer',       email: 'data@temdo.go.tz',          role: 'data_collector', code: 'TEMDO' },
  { name: 'TIRDO Administrator',      email: 'admin@tirdo.go.tz',         role: 'admin',          code: 'TIRDO' },
  { name: 'TIRDO M&E Officer',        email: 'me.officer@tirdo.go.tz',    role: 'me_officer',     code: 'TIRDO' },
  { name: 'TIRDO Data Officer',       email: 'data@tirdo.go.tz',          role: 'data_collector', code: 'TIRDO' },
  { name: 'TANTRADE Administrator',   email: 'admin@tantrade.go.tz',      role: 'admin',          code: 'TANTRADE' },
  { name: 'TANTRADE M&E Officer',     email: 'me.officer@tantrade.go.tz', role: 'me_officer',     code: 'TANTRADE' },
  { name: 'TANTRADE Data Officer',    email: 'data@tantrade.go.tz',       role: 'data_collector', code: 'TANTRADE' },
  { name: 'WMA Administrator',        email: 'admin@wma.go.tz',           role: 'admin',          code: 'WMA' },
  { name: 'WMA M&E Officer',          email: 'me.officer@wma.go.tz',      role: 'me_officer',     code: 'WMA' },
  { name: 'WMA Data Officer',         email: 'data@wma.go.tz',            role: 'data_collector', code: 'WMA' },
  { name: 'WRRB Administrator',       email: 'admin@wrrb.go.tz',          role: 'admin',          code: 'WRRB' },
  { name: 'WRRB M&E Officer',         email: 'me.officer@wrrb.go.tz',     role: 'me_officer',     code: 'WRRB' },
  { name: 'WRRB Data Officer',        email: 'data@wrrb.go.tz',           role: 'data_collector', code: 'WRRB' },
];

// ─── RESULTS FRAMEWORK ────────────────────────────────────────────────────────
// Based on MIT Strategic Plan 2026/27–2030/31 and Performance Agreement 2025/26
// 8 Strategic Objectives: A, B, C, D, E, F, X, Y
const framework = [

  // ══════════════════════════════════════════════════════════════════
  // OBJECTIVE A (Crosscutting)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'so-A', orderNo: 1,
    name: 'HIV/AIDS Infections and Non-Communicable Diseases Reduced and Supportive Services Improved',
    description: 'Integrate HIV/AIDS and NCD interventions into MIT workplace programs to protect workforce health and sustain productivity across all departments and institutions under the Ministry.',
    outcomes: [
      {
        id: 'oc-A1', orderNo: 1,
        name: 'Staff health and wellness improved across MIT and its institutions',
        outputs: [
          {
            id: 'op-A1-1', orderNo: 1,
            name: 'HIV/AIDS and NCD awareness campaigns conducted for MIT staff',
            activities: [
              { id: 'act-A1-1-1', orderNo: 1, name: 'Conduct bi-annual HIV/AIDS awareness and VCT sessions for all MIT staff' },
              { id: 'act-A1-1-2', orderNo: 2, name: 'Implement NCD screening and health check-up programs for staff' },
              { id: 'act-A1-1-3', orderNo: 3, name: 'Facilitate physical fitness and wellness programs at MIT headquarters' },
            ],
            indicators: [
              {
                code: 'HIV-A-01', name: 'Number of HIV/AIDS and NCD awareness sessions conducted',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT HR Department Records', responsiblePerson: 'Head of Human Resources and Administration',
                reportingFrequency: 'annual', baselineValue: 2, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 2 },
                actuals: {},
              },
              {
                code: 'HIV-A-02', name: 'Number of MIT staff screened for NCDs and HIV/AIDS',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT Workplace Health Records', responsiblePerson: 'Head of Human Resources and Administration',
                reportingFrequency: 'annual', baselineValue: 150, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 200 },
                actuals: {},
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // OBJECTIVE B (Crosscutting)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'so-B', orderNo: 2,
    name: 'Implementation of National Anti-Corruption Strategy Enhanced and Sustained',
    description: 'Strengthen anti-corruption frameworks, staff awareness, and implementation of the Public Service Code of Conduct across all MIT departments and institutions to promote transparency and accountability.',
    outcomes: [
      {
        id: 'oc-B1', orderNo: 1,
        name: 'Anti-corruption culture and code of conduct institutionalized at MIT',
        outputs: [
          {
            id: 'op-B1-1', orderNo: 1,
            name: 'Anti-corruption awareness programs implemented across MIT',
            activities: [
              { id: 'act-B1-1-1', orderNo: 1, name: 'Conduct anti-corruption awareness sessions for all MIT staff annually' },
              { id: 'act-B1-1-2', orderNo: 2, name: 'Implement and monitor Public Service Code of Conduct in all MIT departments' },
              { id: 'act-B1-1-3', orderNo: 3, name: 'Establish confidential system for receiving and managing public integrity complaints' },
            ],
            indicators: [
              {
                code: 'ANTI-B-01', name: 'Number of anti-corruption awareness sessions conducted for MIT staff',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT Ethics and Anti-Corruption Unit Records',
                responsiblePerson: 'Anti-Corruption Focal Person',
                reportingFrequency: 'annual', baselineValue: 2, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 2 },
                actuals: {},
              },
              {
                code: 'ANTI-B-02', name: 'Percentage of MIT departments with Public Service Code of Conduct fully implemented',
                unit: 'Percentage', formulaType: 'proportion_pct',
                formulaConfig: { totalNetwork: 100 },
                dataSource: 'MIT Internal Audit Reports / Ethics Unit',
                responsiblePerson: 'Anti-Corruption Focal Person',
                reportingFrequency: 'annual', baselineValue: 60, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 80 },
                actuals: {},
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // OBJECTIVE C (Core Function)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'so-C', orderNo: 3,
    name: 'Industrial Performance Improved and Sustained',
    description: 'Advance Tanzania\'s industrialization through research, innovation, KAIZEN quality improvement, technology transfer, SME and industrial cluster development, value addition and investment facilitation across all 26 regions.',
    outcomes: [
      {
        id: 'oc-C1', orderNo: 1,
        name: 'Industrial R&D, innovation and technology transfer enhanced',
        description: 'TIRDO, TEMDO and MIT facilitate increased applied research, technology transfer and industrial innovation.',
        outputs: [
          {
            id: 'op-C1-1', orderNo: 1,
            name: 'Industrial sector research studies conducted and findings disseminated (TIRDO / MIT)',
            activities: [
              { id: 'act-C1-1-1', orderNo: 1, name: 'Conduct applied industrial research studies on priority manufacturing sectors', isCritical: true },
              { id: 'act-C1-1-2', orderNo: 2, name: 'Disseminate research findings to industries, policymakers and stakeholders' },
              { id: 'act-C1-1-3', orderNo: 3, name: 'Conduct national industrial sector census and surveys' },
            ],
            indicators: [
              {
                code: 'IND-C-01', name: 'Number of industrial sector research studies conducted and findings disseminated',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'TIRDO / MIT Research Records', responsiblePerson: 'Director of Industrial Development',
                reportingFrequency: 'annual', baselineValue: 3, baselineYear: 2024,
                institutionCode: 'TIRDO',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 1 },
                actuals: {},
              },
              {
                code: 'IND-C-02', name: 'Number of technologies developed and transferred to enterprises',
                unit: 'Number', formulaType: 'cumulative_total',
                formulaConfig: { baselineValue: 45 },
                dataSource: 'TIRDO Technology Transfer Register / TEMDO Records', responsiblePerson: 'TIRDO Director General',
                reportingFrequency: 'quarterly', baselineValue: 45, baselineYear: 2024,
                institutionCode: 'TIRDO',
                targets: { q1: 2, q2: 2, q3: 2, q4: 2, annual: 8 },
                actuals: { Q1: 3, Q2: 2 },
              },
              {
                code: 'IND-C-03', name: 'Number of engineering design and consultancy services provided to enterprises (TEMDO)',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'TEMDO Client Service Records', responsiblePerson: 'TEMDO Director General',
                reportingFrequency: 'quarterly', baselineValue: 60, baselineYear: 2024,
                institutionCode: 'TEMDO',
                targets: { q1: 20, q2: 20, q3: 20, q4: 20, annual: 80 },
                actuals: { Q1: 22, Q2: 21 },
              },
            ],
          },
          {
            id: 'op-C1-2', orderNo: 2,
            name: 'KAIZEN quality and productivity practices implemented in targeted industries (MIT)',
            activities: [
              { id: 'act-C1-2-1', orderNo: 1, name: 'Roll out KAIZEN implementation in industries and institutions across 26 regions', isCritical: true },
              { id: 'act-C1-2-2', orderNo: 2, name: 'Train KAIZEN facilitators and coaches for industries and SMEs' },
              { id: 'act-C1-2-3', orderNo: 3, name: 'Monitor and evaluate KAIZEN implementation outcomes in targeted enterprises' },
            ],
            indicators: [
              {
                code: 'IND-C-04', name: 'Number of institutions/industries implementing KAIZEN cycles annually',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT KAIZEN Implementation Monitoring Reports',
                responsiblePerson: 'Director of Industrial Development',
                reportingFrequency: 'quarterly', baselineValue: 18, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 8, q2: 8, q3: 8, q4: 8, annual: 32 },
                actuals: { Q1: 9, Q2: 8 },
              },
            ],
          },
        ],
      },
      {
        id: 'oc-C2', orderNo: 2,
        name: 'SME development, clustering and value addition strengthened',
        description: 'SIDO and CAMARTEC expand SME support, industrial clusters, agricultural mechanization and value addition programs.',
        outputs: [
          {
            id: 'op-C2-1', orderNo: 1,
            name: 'SME industrial clusters established and operationalized (SIDO / MIT)',
            activities: [
              { id: 'act-C2-1-1', orderNo: 1, name: 'Identify and develop sites for SME industrial clusters across districts' },
              { id: 'act-C2-1-2', orderNo: 2, name: 'Provide business development services, training and credit facilitation to SMEs' },
              { id: 'act-C2-1-3', orderNo: 3, name: 'Develop and implement programs to promote value addition in light manufacturing' },
            ],
            indicators: [
              {
                code: 'IND-C-05', name: 'Number of new industrial clusters for SMEs established and operational',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'SIDO Industrial Cluster Register', responsiblePerson: 'SIDO Director General',
                reportingFrequency: 'quarterly', baselineValue: 89, baselineYear: 2024,
                institutionCode: 'SIDO',
                targets: { q1: 7, q2: 7, q3: 7, q4: 7, annual: 28 },
                actuals: { Q1: 8, Q2: 8 },
              },
              {
                code: 'IND-C-06', name: 'Number of SMEs receiving business development services from SIDO',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'SIDO Client Service Database', responsiblePerson: 'SIDO Director General',
                reportingFrequency: 'quarterly', baselineValue: 4200, baselineYear: 2024,
                institutionCode: 'SIDO',
                targets: { q1: 1500, q2: 1500, q3: 1500, q4: 1500, annual: 6000 },
                actuals: { Q1: 1650, Q2: 1580 },
              },
              {
                code: 'IND-C-07', name: 'Number of SMEs/light manufacturing enterprises adopting value addition techniques',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT / SIDO Value Addition Programme Records',
                responsiblePerson: 'Director of SME Development',
                reportingFrequency: 'quarterly', baselineValue: 320, baselineYear: 2024,
                institutionCode: 'SIDO',
                targets: { q1: 80, q2: 80, q3: 80, q4: 80, annual: 320 },
                actuals: { Q1: 88, Q2: 82 },
              },
            ],
          },
          {
            id: 'op-C2-2', orderNo: 2,
            name: 'Agricultural mechanization and rural technology promoted (CAMARTEC)',
            activities: [
              { id: 'act-C2-2-1', orderNo: 1, name: 'Manufacture and distribute agricultural equipment to smallholder farmers' },
              { id: 'act-C2-2-2', orderNo: 2, name: 'Conduct demonstrations on modern agricultural technologies across regions' },
            ],
            indicators: [
              {
                code: 'IND-C-08', name: 'Number of agricultural equipment manufactured and distributed by CAMARTEC',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'CAMARTEC Production and Distribution Records',
                responsiblePerson: 'CAMARTEC Director General',
                reportingFrequency: 'quarterly', baselineValue: 350, baselineYear: 2024,
                institutionCode: 'CAMARTEC',
                targets: { q1: 100, q2: 120, q3: 120, q4: 110, annual: 450 },
                actuals: { Q1: 95, Q2: 112 },
              },
            ],
          },
        ],
      },
      {
        id: 'oc-C3', orderNo: 3,
        name: 'Industrial investment facilitated and industrial infrastructure developed',
        description: 'NDC and MIT facilitate industrial investment projects and develop industrial infrastructure across Tanzania.',
        outputs: [
          {
            id: 'op-C3-1', orderNo: 1,
            name: 'Industrial investment initiatives facilitated and supported (NDC / MIT)',
            activities: [
              { id: 'act-C3-1-1', orderNo: 1, name: 'Identify and develop bankable industrial investment opportunities' },
              { id: 'act-C3-1-2', orderNo: 2, name: 'Participate in investment promotion road shows and forums' },
              { id: 'act-C3-1-3', orderNo: 3, name: 'Develop and review industrial policies and strategic frameworks' },
            ],
            indicators: [
              {
                code: 'IND-C-09', name: 'Number of industrial investment projects approved and facilitated',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'NDC Project Portfolio / MIT Investment Facilitation Records',
                responsiblePerson: 'NDC Managing Director',
                reportingFrequency: 'quarterly', baselineValue: 28, baselineYear: 2024,
                institutionCode: 'NDC',
                targets: { q1: 4, q2: 4, q3: 4, q4: 4, annual: 16 },
                actuals: { Q1: 5, Q2: 4 },
              },
              {
                code: 'IND-C-10', name: 'Number of industrial sector infrastructure initiatives supported/coordinated',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT Industrial Development Department Records',
                responsiblePerson: 'Director of Industrial Development',
                reportingFrequency: 'quarterly', baselineValue: 12, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 2, q2: 2, q3: 2, q4: 2, annual: 8 },
                actuals: { Q1: 3, Q2: 2 },
              },
            ],
          },
        ],
      },
      {
        id: 'oc-C4', orderNo: 4,
        name: 'Industrial policies, strategies and diagnostic studies developed and implemented',
        description: 'DID develops, reviews and monitors industrial policies, strategies and conducts diagnostic studies on priority sub-sectors.',
        outputs: [
          {
            id: 'op-C4-1', orderNo: 1,
            name: 'Industrial policies, strategies and diagnostic studies developed (DID)',
            activities: [
              { id: 'act-C4-1-1', orderNo: 1, name: 'Develop, review and monitor strategies, plans, programs and legislations for industrial development', isCritical: true },
              { id: 'act-C4-1-2', orderNo: 2, name: 'Undertake industrial diagnostic studies on priority sub-sectors' },
              { id: 'act-C4-1-3', orderNo: 3, name: 'Conduct industrial surveys to develop industrial profile and databanks' },
              { id: 'act-C4-1-4', orderNo: 4, name: 'Facilitate establishment of Tanzania Industrial Master Plan', isCritical: true },
            ],
            indicators: [
              {
                code: 'DID-C-01', name: 'Number of industrial strategies, plans, programs and legislations developed/reviewed/monitored',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DID Department Records', responsiblePerson: 'Director - DID',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 2, q2: 2, q3: 0, q4: 0, annual: 4 },
                actuals: { Q1: 2, Q2: 2 },
              },
              {
                code: 'DID-C-02', name: 'Number of industrial diagnostic studies conducted on priority sub-sectors',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DID Research Reports', responsiblePerson: 'Director - DID',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 2, q2: 1, q3: 0, q4: 0, annual: 3 },
                actuals: { Q1: 2, Q2: 1 },
              },
              {
                code: 'DID-C-03', name: 'Number of industrial surveys conducted for industrial profile and databanks',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DID Survey Records', responsiblePerson: 'Director - DID',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 1, q2: 0, q3: 0, q4: 0, annual: 1 },
                actuals: { Q1: 1, Q2: 0 },
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // OBJECTIVE D (Core Function)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'so-D', orderNo: 4,
    name: 'Business Environment Improved',
    description: 'Streamline business registration, licensing, SME formalization, access to finance, and the regulatory framework to create a competitive, transparent, and innovation-driven business ecosystem in Tanzania.',
    outcomes: [
      {
        id: 'oc-D1', orderNo: 1,
        name: 'Business registration, licensing and regulatory framework streamlined',
        description: 'BRELA delivers faster, more accessible registration and licensing services; regulatory procedures simplified.',
        outputs: [
          {
            id: 'op-D1-1', orderNo: 1,
            name: 'Business registration services digitized and improved (BRELA)',
            activities: [
              { id: 'act-D1-1-1', orderNo: 1, name: 'Digitize and automate business registration through the Business Registration System (BRS)', isCritical: true },
              { id: 'act-D1-1-2', orderNo: 2, name: 'Expand business registration access to regional offices' },
              { id: 'act-D1-1-3', orderNo: 3, name: 'Reduce business registration time to less than 1 working day' },
            ],
            indicators: [
              {
                code: 'BIZ-D-01', name: 'Number of businesses registered annually',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'BRELA Business Registration System (BRS)', responsiblePerson: 'BRELA Director General',
                reportingFrequency: 'quarterly', baselineValue: 45000, baselineYear: 2024,
                institutionCode: 'BRELA',
                targets: { q1: 14000, q2: 14000, q3: 14000, q4: 14000, annual: 56000 },
                actuals: { Q1: 15230, Q2: 14800 },
              },
              {
                code: 'BIZ-D-02', name: 'Average number of days to register a business',
                unit: 'Days', formulaType: 'manual',
                formulaConfig: {},
                dataSource: 'BRELA BRS System Process Logs', responsiblePerson: 'BRELA Director General',
                reportingFrequency: 'quarterly', baselineValue: 3, baselineYear: 2024,
                institutionCode: 'BRELA',
                targets: { q1: 1, q2: 1, q3: 1, q4: 1, annual: 1 },
                actuals: { Q1: 1, Q2: 1 },
              },
              {
                code: 'BIZ-D-03', name: 'Number of business licenses issued and renewed',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'BRELA Licensing Database', responsiblePerson: 'BRELA Director General',
                reportingFrequency: 'quarterly', baselineValue: 28000, baselineYear: 2024,
                institutionCode: 'BRELA',
                targets: { q1: 8000, q2: 8000, q3: 8000, q4: 8000, annual: 32000 },
                actuals: { Q1: 8450, Q2: 8200 },
              },
              {
                code: 'BIZ-D-04', name: 'Percentage increase in formally registered businesses',
                unit: 'Percentage', formulaType: 'proportion_pct',
                formulaConfig: { totalNetwork: 100 },
                dataSource: 'BRELA Annual Business Registration Statistics',
                responsiblePerson: 'BRELA Director General',
                reportingFrequency: 'annual', baselineValue: 8, baselineYear: 2024,
                institutionCode: 'BRELA',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 15 },
                actuals: {},
              },
            ],
          },
        ],
      },
      {
        id: 'oc-D2', orderNo: 2,
        name: 'SME development ecosystem and access to finance strengthened',
        description: 'SIDO and MIT strengthen SME formalization, financing mechanisms and business support ecosystem.',
        outputs: [
          {
            id: 'op-D2-1', orderNo: 1,
            name: 'Framework for SME business formalization developed and implemented (MIT/SIDO)',
            activities: [
              { id: 'act-D2-1-1', orderNo: 1, name: 'Review and implement SME Development Policy 2003 (2025 Edition)' },
              { id: 'act-D2-1-2', orderNo: 2, name: 'Implement National Entrepreneurship Training Framework and empowerment centers' },
              { id: 'act-D2-1-3', orderNo: 3, name: 'Develop and operationalize mechanism for SME access to financial services' },
            ],
            indicators: [
              {
                code: 'BIZ-D-05', name: 'Number of SMEs formalized (registered) through SME support programs',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT / SIDO SME Formalization Records',
                responsiblePerson: 'Director of SME Development',
                reportingFrequency: 'quarterly', baselineValue: 16489, baselineYear: 2024,
                institutionCode: 'SIDO',
                targets: { q1: 1000, q2: 1000, q3: 1000, q4: 1000, annual: 4000 },
                actuals: { Q1: 1120, Q2: 980 },
              },
              {
                code: 'BIZ-D-06', name: 'Number of SMEs accessing credit facilities through SIDO and government programs',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'SIDO Credit Facilitation Reports / MIT SME Finance Records',
                responsiblePerson: 'SIDO Director General',
                reportingFrequency: 'quarterly', baselineValue: 820, baselineYear: 2024,
                institutionCode: 'SIDO',
                targets: { q1: 250, q2: 250, q3: 250, q4: 250, annual: 1000 },
                actuals: { Q1: 280, Q2: 240 },
              },
            ],
          },
        ],
      },
      {
        id: 'oc-D4', orderNo: 4,
        name: 'SME development policy, formalization and market competitiveness improved (DSME)',
        description: 'DSME reviews SME policy, promotes business formalization, facilitates SME clusters and market access.',
        outputs: [
          {
            id: 'op-D4-1', orderNo: 1,
            name: 'SME development policy reviewed and business formalization promoted (DSME)',
            activities: [
              { id: 'act-D4-1-1', orderNo: 1, name: 'Finalize review of SME Development Policy 2003 and launch updated policy', isCritical: true },
              { id: 'act-D4-1-2', orderNo: 2, name: 'Create awareness on loan schemes and credit for MSMEs across regions' },
              { id: 'act-D4-1-3', orderNo: 3, name: 'Review Guidebook for Business Formalization of informal enterprises' },
              { id: 'act-D4-1-4', orderNo: 4, name: 'Coordinate establishment and development of SME industrial clusters' },
              { id: 'act-D4-1-5', orderNo: 5, name: 'Promote LGAs to construct shaded premises for SME activities' },
              { id: 'act-D4-1-6', orderNo: 6, name: 'Facilitate SME access to regional and international market via trade fairs and exhibitions' },
            ],
            indicators: [
              {
                code: 'DSME-D-01', name: 'Percentage achieved in review of SME Development Policy 2003',
                unit: 'Percentage', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DSME Department Records / Government Publications', responsiblePerson: 'Director - DSME',
                reportingFrequency: 'quarterly', baselineValue: 60, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 85, q2: 10, q3: 5, q4: 0, annual: 100 },
                actuals: { Q1: 85, Q2: 10 },
              },
              {
                code: 'DSME-D-02', name: 'Number of regions visited for MSME loan scheme awareness',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DSME Field Visit Reports', responsiblePerson: 'Director - DSME',
                reportingFrequency: 'quarterly', baselineValue: 12, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 3, q2: 2, q3: 1, q4: 1, annual: 7 },
                actuals: { Q1: 3, Q2: 2 },
              },
              {
                code: 'DSME-C-01', name: 'Number of SME industrial clusters coordinated and assessed',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DSME Cluster Coordination Reports', responsiblePerson: 'Director - DSME',
                reportingFrequency: 'quarterly', baselineValue: 14, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 0, q2: 4, q3: 1, q4: 1, annual: 6 },
                actuals: { Q1: 0, Q2: 4 },
              },
              {
                code: 'DSME-D-03', name: 'Number of consultative meetings conducted with LGAs on SME premises',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DSME LGA Meeting Records', responsiblePerson: 'Director - DSME',
                reportingFrequency: 'quarterly', baselineValue: 13, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 6, q2: 6, q3: 0, q4: 1, annual: 13 },
                actuals: { Q1: 6, Q2: 6 },
              },
              {
                code: 'DSME-E-01', name: 'Number of trade fairs and exhibitions facilitated for SMEs',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DSME Trade Fair Participation Reports', responsiblePerson: 'Director - DSME',
                reportingFrequency: 'quarterly', baselineValue: 6, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 2, q2: 1, q3: 0, q4: 0, annual: 3 },
                actuals: { Q1: 2, Q2: 1 },
              },
            ],
          },
        ],
      },
      {
        id: 'oc-D5', orderNo: 5,
        name: 'Domestic trade facilitation, market intelligence and business formalization improved (DTD)',
        description: 'DTD facilitates domestic and cross-border trade, business dialogue, market intelligence and the National Export Strategy.',
        outputs: [
          {
            id: 'op-D5-1', orderNo: 1,
            name: 'Trade facilitation, business dialogue and market intelligence conducted (DTD)',
            activities: [
              { id: 'act-D5-1-1', orderNo: 1, name: 'Organise conferences and meetings to resolve technical challenges faced by businesses' },
              { id: 'act-D5-1-2', orderNo: 2, name: 'Conduct promotion of trade through digital marketing campaigns' },
              { id: 'act-D5-1-3', orderNo: 3, name: 'Monitor and coordinate implementation of National Export Strategy (NES)' },
              { id: 'act-D5-1-4', orderNo: 4, name: 'Strengthen and promote formalization of Cross Border Trade', isCritical: true },
              { id: 'act-D5-1-5', orderNo: 5, name: 'Collect, analyse, archive and disseminate market information for agricultural and non-agricultural commodities' },
            ],
            indicators: [
              {
                code: 'DTD-D-01', name: 'Number of meetings/conferences held for gathering and resolving business challenges',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DTD Meeting Reports', responsiblePerson: 'Director - DTD',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 3, q2: 2, q3: 0, q4: 0, annual: 5 },
                actuals: { Q1: 3, Q2: 3 },
              },
              {
                code: 'DTD-D-02', name: 'Number of business challenges resolved through DTD facilitation',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DTD Business Dialogue Reports', responsiblePerson: 'Director - DTD',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 12, q2: 12, q3: 13, q4: 13, annual: 50 },
                actuals: { Q1: 12, Q2: 24 },
              },
              {
                code: 'DTD-D-03', name: 'Number of businesses formalized through Cross Border Trade program',
                unit: 'Number', formulaType: 'cumulative_total',
                formulaConfig: { baselineValue: 0 },
                dataSource: 'DTD Cross Border Trade Records', responsiblePerson: 'Director - DTD',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 6680, q2: 6680, q3: 6680, q4: 6680, annual: 26720 },
                actuals: { Q1: 14376, Q2: 11838 },
              },
              {
                code: 'DTD-E-01', name: 'Number of market information reports published (agricultural and non-agricultural)',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DTD Market Information System (MIS)', responsiblePerson: 'Director - DTD',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 3, q2: 3, q3: 0, q4: 0, annual: 6 },
                actuals: { Q1: 3, Q2: 3 },
              },
            ],
          },
        ],
      },
      {
        id: 'oc-D3', orderNo: 3,
        name: 'Fair competition and consumer protection ensured',
        description: 'FCC and FCT ensure level playing field, investigate anti-competitive practices and adjudicate competition cases.',
        outputs: [
          {
            id: 'op-D3-1', orderNo: 1,
            name: 'Competition law enforced and anti-competitive practices curbed (FCC)',
            activities: [
              { id: 'act-D3-1-1', orderNo: 1, name: 'Investigate anti-competitive practices, mergers and acquisitions' },
              { id: 'act-D3-1-2', orderNo: 2, name: 'Handle and resolve consumer complaints in priority sectors' },
              { id: 'act-D3-1-3', orderNo: 3, name: 'Conduct market studies on competition in key sectors' },
            ],
            indicators: [
              {
                code: 'BIZ-D-07', name: 'Number of competition cases investigated and resolved by FCC',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'FCC Case Management System', responsiblePerson: 'FCC Director General',
                reportingFrequency: 'quarterly', baselineValue: 38, baselineYear: 2024,
                institutionCode: 'FCC',
                targets: { q1: 12, q2: 12, q3: 12, q4: 12, annual: 48 },
                actuals: { Q1: 11, Q2: 10 },
              },
              {
                code: 'BIZ-D-08', name: 'Number of competition and consumer cases adjudicated by FCT',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'FCT Case Register', responsiblePerson: 'FCT Registrar',
                reportingFrequency: 'quarterly', baselineValue: 22, baselineYear: 2024,
                institutionCode: 'FCT',
                targets: { q1: 7, q2: 7, q3: 7, q4: 7, annual: 28 },
                actuals: { Q1: 6, Q2: 7 },
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // OBJECTIVE E (Core Function)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'so-E', orderNo: 5,
    name: 'Trade and Market Competitiveness Enhanced',
    description: 'Improve Tanzania\'s trade policy framework, export promotion, market information systems, standards compliance, trade negotiations (AfCFTA, EAC, SADC, WTO), and market infrastructure to strengthen market competitiveness.',
    outcomes: [
      {
        id: 'oc-E1', orderNo: 1,
        name: 'Export volume and value increased through trade promotion and market access',
        description: 'TANTRADE and MIT expand export promotion activities, trade negotiations and market facilitation.',
        outputs: [
          {
            id: 'op-E1-1', orderNo: 1,
            name: 'Export promotion and market intelligence conducted (TANTRADE / MIT)',
            activities: [
              { id: 'act-E1-1-1', orderNo: 1, name: 'Organize participation in international and regional trade fairs and exhibitions', isCritical: true },
              { id: 'act-E1-1-2', orderNo: 2, name: 'Conduct market research on agricultural and non-agricultural export products' },
              { id: 'act-E1-1-3', orderNo: 3, name: 'Develop and implement Market Promotion Programme for Tanzanian products' },
            ],
            indicators: [
              {
                code: 'TRD-E-01', name: 'Value of exports facilitated through TANTRADE and MIT interventions (USD Million)',
                unit: 'USD Million', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'TANTRADE Export Facilitation Reports / BoT Trade Statistics',
                responsiblePerson: 'TANTRADE Director General',
                reportingFrequency: 'quarterly', baselineValue: 380, baselineYear: 2024,
                institutionCode: 'TANTRADE',
                targets: { q1: 110, q2: 115, q3: 120, q4: 130, annual: 475 },
                actuals: { Q1: 112, Q2: 114 },
              },
              {
                code: 'TRD-E-02', name: 'Number of exporters registered and supported by TANTRADE',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'TANTRADE Exporter Database', responsiblePerson: 'TANTRADE Director General',
                reportingFrequency: 'quarterly', baselineValue: 1850, baselineYear: 2024,
                institutionCode: 'TANTRADE',
                targets: { q1: 150, q2: 150, q3: 150, q4: 150, annual: 600 },
                actuals: { Q1: 162, Q2: 155 },
              },
              {
                code: 'TRD-E-03', name: 'Percentage contribution of manufacturing sector to total exports',
                unit: 'Percentage', formulaType: 'proportion_pct',
                formulaConfig: { totalNetwork: 100 },
                dataSource: 'BoT / NBS Trade Statistics', responsiblePerson: 'Director of Trade Development',
                reportingFrequency: 'annual', baselineValue: 18, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 22 },
                actuals: {},
              },
            ],
          },
          {
            id: 'op-E1-2', orderNo: 2,
            name: 'Trade negotiations concluded and trade agreements implemented (MIT)',
            activities: [
              { id: 'act-E1-2-1', orderNo: 1, name: 'Conclude bilateral trade negotiations and facilitate MoU signing' },
              { id: 'act-E1-2-2', orderNo: 2, name: 'Implement AfCFTA Strategy and facilitate Tanzania\'s participation', isCritical: true },
              { id: 'act-E1-2-3', orderNo: 3, name: 'Coordinate National Trade Facilitation Committees (NMC for NTBs, TBT, SPS, NCTF)' },
              { id: 'act-E1-2-4', orderNo: 4, name: 'Develop and implement E-Commerce Strategy for Tanzania' },
            ],
            indicators: [
              {
                code: 'TRD-E-04', name: 'Number of trade agreements/negotiations concluded (bilateral, regional, multilateral)',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT Trade Development Department Records',
                responsiblePerson: 'Director of Trade Development',
                reportingFrequency: 'quarterly', baselineValue: 28, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 3, q2: 3, q3: 3, q4: 3, annual: 12 },
                actuals: { Q1: 4, Q2: 5 },
              },
              {
                code: 'TRD-E-05', name: 'Number of national trade facilitation committee meetings organized/coordinated',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT Trade Development Department Records',
                responsiblePerson: 'Director of Trade Development',
                reportingFrequency: 'quarterly', baselineValue: 8, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 2, q2: 2, q3: 2, q4: 2, annual: 8 },
                actuals: { Q1: 2, Q2: 3 },
              },
            ],
          },
          {
            id: 'op-E1-3', orderNo: 3,
            name: 'Trade integration negotiations and bilateral/multilateral agreements coordinated (DTI)',
            activities: [
              { id: 'act-E1-3-1', orderNo: 1, name: 'Negotiate Market Access in EAC, AfCFTA, TFTA, SADC', isCritical: true },
              { id: 'act-E1-3-2', orderNo: 2, name: 'Create stakeholder awareness on Market Access opportunities in EAC, AfCFTA, AGOA, SADC' },
              { id: 'act-E1-3-3', orderNo: 3, name: 'Coordinate and participate in WTO TFA, Agriculture, Trade in Services, TBT and SPS committee meetings' },
              { id: 'act-E1-3-4', orderNo: 4, name: 'Facilitate NTBs elimination meetings and coordinate National Trade Facilitation committees' },
              { id: 'act-E1-3-5', orderNo: 5, name: 'Coordinate and participate in Joint Trade Committee (JTC) and Joint Permanent Commission (JPC) meetings' },
              { id: 'act-E1-3-6', orderNo: 6, name: 'Coordinate AfCFTA National Implementation Committee and awareness building' },
            ],
            indicators: [
              {
                code: 'DTI-E-01', name: 'Number of EAC/AfCFTA/TFTA/SADC negotiation meetings attended',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DTI Department Reports', responsiblePerson: 'Director - DTI',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 1, q2: 3, q3: 0, q4: 0, annual: 4 },
                actuals: { Q1: 1, Q2: 3 },
              },
              {
                code: 'DTI-E-02', name: 'Number of stakeholder awareness sessions on Market Access opportunities conducted',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DTI Awareness Session Reports', responsiblePerson: 'Director - DTI',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 1, q2: 1, q3: 1, q4: 1, annual: 4 },
                actuals: { Q1: 1, Q2: 1 },
              },
              {
                code: 'DTI-E-03', name: 'Number of NTBs elimination and Trade Facilitation national committee meetings attended/coordinated',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DTI NTBs/Trade Facilitation Records', responsiblePerson: 'Director - DTI',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 1, q2: 2, q3: 1, q4: 0, annual: 4 },
                actuals: { Q1: 1, Q2: 2 },
              },
              {
                code: 'DTI-E-04', name: 'Number of JTC/JPC meetings attended in strategic countries (China, Turkey, India, Kenya)',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'DTI Bilateral Meeting Reports', responsiblePerson: 'Director - DTI',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 2, q2: 2, q3: 0, q4: 0, annual: 4 },
                actuals: { Q1: 2, Q2: 2 },
              },
            ],
          },
        ],
      },
      {
        id: 'oc-E2', orderNo: 2,
        name: 'Standards, quality assurance, market infrastructure and warehouse system strengthened',
        description: 'TBS, WMA and WRRB ensure product quality, accurate measurements and functional warehouse receipts system.',
        outputs: [
          {
            id: 'op-E2-1', orderNo: 1,
            name: 'National standards developed, disseminated and products certified (TBS)',
            activities: [
              { id: 'act-E2-1-1', orderNo: 1, name: 'Develop and review national standards in priority industrial and trade sectors', isCritical: true },
              { id: 'act-E2-1-2', orderNo: 2, name: 'Conduct product certification and type approval services' },
              { id: 'act-E2-1-3', orderNo: 3, name: 'Conduct standards awareness campaigns for industry and consumers' },
            ],
            indicators: [
              {
                code: 'STD-E-01', name: 'Number of national standards developed and reviewed by TBS',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'TBS Standards Development Register', responsiblePerson: 'TBS Director General',
                reportingFrequency: 'quarterly', baselineValue: 380, baselineYear: 2024,
                institutionCode: 'TBS',
                targets: { q1: 30, q2: 30, q3: 30, q4: 30, annual: 120 },
                actuals: { Q1: 33, Q2: 31 },
              },
              {
                code: 'STD-E-02', name: 'Number of products certified by TBS',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'TBS Product Certification Database', responsiblePerson: 'TBS Director General',
                reportingFrequency: 'quarterly', baselineValue: 2400, baselineYear: 2024,
                institutionCode: 'TBS',
                targets: { q1: 700, q2: 700, q3: 700, q4: 700, annual: 2800 },
                actuals: { Q1: 742, Q2: 715 },
              },
              {
                code: 'STD-E-03', name: 'Number of weighing and measuring instruments verified by WMA',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'WMA Inspection Database', responsiblePerson: 'WMA Director General',
                reportingFrequency: 'quarterly', baselineValue: 185000, baselineYear: 2024,
                institutionCode: 'WMA',
                targets: { q1: 55000, q2: 55000, q3: 55000, q4: 55000, annual: 220000 },
                actuals: { Q1: 58200, Q2: 56000 },
              },
            ],
          },
          {
            id: 'op-E2-2', orderNo: 2,
            name: 'Warehouse receipt system strengthened and market infrastructure improved (WRRB)',
            activities: [
              { id: 'act-E2-2-1', orderNo: 1, name: 'Register, certify and monitor warehouse operators and facilities' },
              { id: 'act-E2-2-2', orderNo: 2, name: 'Sensitize farmers and traders on benefits of the warehouse receipt system' },
              { id: 'act-E2-2-3', orderNo: 3, name: 'Develop and upgrade market infrastructure across districts' },
            ],
            indicators: [
              {
                code: 'TRD-E-06', name: 'Number of certified warehouses operational under the WRS',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'WRRB Warehouse Register', responsiblePerson: 'WRRB Director General',
                reportingFrequency: 'quarterly', baselineValue: 42, baselineYear: 2024,
                institutionCode: 'WRRB',
                targets: { q1: 5, q2: 5, q3: 5, q4: 5, annual: 20 },
                actuals: { Q1: 6, Q2: 5 },
              },
              {
                code: 'TRD-E-07', name: 'Value of goods stored under warehouse receipt system (TZS Billion)',
                unit: 'TZS Billion', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'WRRB Storage and Commodity Reports', responsiblePerson: 'WRRB Director General',
                reportingFrequency: 'quarterly', baselineValue: 85, baselineYear: 2024,
                institutionCode: 'WRRB',
                targets: { q1: 28, q2: 30, q3: 30, q4: 32, annual: 120 },
                actuals: { Q1: 31, Q2: 29 },
              },
              {
                code: 'TRD-E-08', name: 'Number of market facilities constructed, upgraded or made operational',
                unit: 'Number', formulaType: 'cumulative_total',
                formulaConfig: { baselineValue: 367 },
                dataSource: 'MIT Trade Development Department / LGA Market Records',
                responsiblePerson: 'Director of Trade Development',
                reportingFrequency: 'quarterly', baselineValue: 367, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 10, q2: 10, q3: 10, q4: 10, annual: 40 },
                actuals: { Q1: 11, Q2: 10 },
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // OBJECTIVE F (Core Function)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'so-F', orderNo: 6,
    name: 'Institutional Capacity to Effectively Deliver Mandated Functions Strengthened',
    description: 'Strengthen MIT\'s human resources, financial management, ICT, planning, M&E, governance systems, and working environment to deliver quality services to all stakeholders effectively and efficiently.',
    outcomes: [
      {
        id: 'oc-F1', orderNo: 1,
        name: 'Human resource capacity and staff welfare at MIT improved',
        description: 'MIT attracts, retains and develops skilled staff; staff welfare and working conditions improved.',
        outputs: [
          {
            id: 'op-F1-1', orderNo: 1,
            name: 'Human Resource Development Plan implemented and Employment Policy operationalized',
            activities: [
              { id: 'act-F1-1-1', orderNo: 1, name: 'Implement Human Resource Development Plan for MIT and institutions' },
              { id: 'act-F1-1-2', orderNo: 2, name: 'Operationalize Employment Policy and implement Performance Management System' },
              { id: 'act-F1-1-3', orderNo: 3, name: 'Promote and facilitate staff welfare and statutory entitlements' },
            ],
            indicators: [
              {
                code: 'CAP-F-01', name: 'Number of MIT staff trained through short and long courses',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT HR Training Register', responsiblePerson: 'Head of Human Resources and Administration',
                reportingFrequency: 'quarterly', baselineValue: 820, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 80, q2: 80, q3: 80, q4: 80, annual: 320 },
                actuals: { Q1: 88, Q2: 85 },
              },
              {
                code: 'CAP-F-02', name: 'Number of students enrolled in CBE degree and diploma programs',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'CBE Student Enrollment Records', responsiblePerson: 'CBE Principal',
                reportingFrequency: 'annual', baselineValue: 8500, baselineYear: 2024,
                institutionCode: 'CBE',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 9500 },
                actuals: {},
              },
              {
                code: 'CAP-F-03', name: 'Number of professional development and short course participants trained by CBE',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'CBE Short Courses Training Register', responsiblePerson: 'CBE Principal',
                reportingFrequency: 'quarterly', baselineValue: 1200, baselineYear: 2024,
                institutionCode: 'CBE',
                targets: { q1: 400, q2: 400, q3: 400, q4: 400, annual: 1600 },
                actuals: { Q1: 430, Q2: 410 },
              },
            ],
          },
        ],
      },
      {
        id: 'oc-F2', orderNo: 2,
        name: 'Planning, M&E, governance and information systems strengthened',
        description: 'MIT\'s planning, M&E framework, ICT systems, financial management, legal services and governance are effective and fully operational.',
        outputs: [
          {
            id: 'op-F2-1', orderNo: 1,
            name: 'Ministerial M&E Framework operationalized and strategic plan implemented',
            activities: [
              { id: 'act-F2-1-1', orderNo: 1, name: 'Develop and institutionalize the Ministerial M&E Framework', isCritical: true },
              { id: 'act-F2-1-2', orderNo: 2, name: 'Prepare and implement Strategic Plan, Operational Plans and performance reports' },
              { id: 'act-F2-1-3', orderNo: 3, name: 'Establish and utilize Ministerial Statistical Database' },
              { id: 'act-F2-1-4', orderNo: 4, name: 'Mobilize resources for sustainable funding of MIT programs' },
            ],
            indicators: [
              {
                code: 'CAP-F-04', name: 'Number of quarterly and annual performance reports produced on time',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT M&E and Statistics Unit', responsiblePerson: 'M&E and Statistics Coordinator',
                reportingFrequency: 'quarterly', baselineValue: 4, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 1, q2: 1, q3: 1, q4: 1, annual: 5 },
                actuals: { Q1: 1, Q2: 1 },
              },
              {
                code: 'CAP-F-05', name: 'Percentage of annual performance targets met by MIT institutions',
                unit: 'Percentage', formulaType: 'proportion_pct',
                formulaConfig: { totalNetwork: 100 },
                dataSource: 'MIT Annual Performance Review Reports',
                responsiblePerson: 'M&E and Statistics Coordinator',
                reportingFrequency: 'annual', baselineValue: 68, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 80 },
                actuals: {},
              },
              {
                code: 'CAP-F-06', name: 'Audit opinion obtained by MIT (1=Adverse, 2=Disclaimer, 3=Qualified, 4=Unqualified)',
                unit: 'Score (1-4)', formulaType: 'manual',
                formulaConfig: {},
                dataSource: 'Controller and Auditor General Annual Audit Reports',
                responsiblePerson: 'Head of Finance and Accounts',
                reportingFrequency: 'annual', baselineValue: 3, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 4 },
                actuals: {},
              },
            ],
          },
          {
            id: 'op-F2-3', orderNo: 3,
            name: 'M&E framework operationalized and monitoring/evaluation activities implemented (MEU)',
            activities: [
              { id: 'act-F2-3-1', orderNo: 1, name: 'Prepare and track implementation of the Annual Evaluation Plan' },
              { id: 'act-F2-3-2', orderNo: 2, name: 'Monitor implementation of MIT policy, MTSP, annual plans, budget, programs and projects' },
              { id: 'act-F2-3-3', orderNo: 3, name: 'Monitor and verify implementation status of CAG recommendations' },
              { id: 'act-F2-3-4', orderNo: 4, name: 'Prepare Ministry Annual Performance Report, UUU Report and GPR Report' },
              { id: 'act-F2-3-5', orderNo: 5, name: 'Train M&E staff in short and long courses and facilitate M&E Week Conference participation' },
            ],
            indicators: [
              {
                code: 'MEU-F-01', name: 'Number of evaluation reports produced on Ministry strategic plan implementation',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MEU Evaluation Reports', responsiblePerson: 'Head of M&E - MEU',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 2, q2: 0, q3: 0, q4: 0, annual: 2 },
                actuals: { Q1: 2, Q2: 0 },
              },
              {
                code: 'MEU-F-02', name: 'Number of monitoring reports produced on MIT policy, plans, budget, programmes and projects',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MEU Monitoring Reports / Field Visit Reports', responsiblePerson: 'Head of M&E - MEU',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 13, q2: 13, q3: 0, q4: 0, annual: 26 },
                actuals: { Q1: 13, Q2: 13 },
              },
              {
                code: 'MEU-F-03', name: 'Number of CAG recommendations monitored and verified',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MEU CAG Follow-up Verification Reports', responsiblePerson: 'Head of M&E - MEU',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 13, q2: 11, q3: 0, q4: 0, annual: 24 },
                actuals: { Q1: 13, Q2: 11 },
              },
              {
                code: 'MEU-F-04', name: 'Number of performance reports (Annual, UUU, GPR) prepared and submitted',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MEU Performance Report Submission Records', responsiblePerson: 'Head of M&E - MEU',
                reportingFrequency: 'quarterly', baselineValue: 4, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 1, q2: 1, q3: 0, q4: 0, annual: 2 },
                actuals: { Q1: 1, Q2: 1 },
              },
              {
                code: 'MEU-F-05', name: 'Number of M&E staff trained in short and long courses',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MEU Training Records / Attendance Certificates', responsiblePerson: 'Head of M&E - MEU',
                reportingFrequency: 'quarterly', baselineValue: 0, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: 0, q2: 3, q3: 0, q4: 0, annual: 3 },
                actuals: { Q1: 0, Q2: 2 },
              },
            ],
          },
          {
            id: 'op-F2-2', orderNo: 2,
            name: 'ICT infrastructure and e-government services strengthened',
            activities: [
              { id: 'act-F2-2-1', orderNo: 1, name: 'Upgrade ICT infrastructure and digital systems across MIT departments' },
              { id: 'act-F2-2-2', orderNo: 2, name: 'Develop integrated government communication and knowledge management framework' },
              { id: 'act-F2-2-3', orderNo: 3, name: 'Deliver ICT services and support to all MIT departments and institutions' },
            ],
            indicators: [
              {
                code: 'CAP-F-07', name: 'Number of ICT services/systems delivered or upgraded at MIT',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT ICT Unit Service Records',
                responsiblePerson: 'Head of Information and Communication Technology',
                reportingFrequency: 'annual', baselineValue: 3, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 5 },
                actuals: {},
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // OBJECTIVE X (Crosscutting)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'so-X', orderNo: 7,
    name: 'Management of Environment and Ecosystems Enhanced and Sustained',
    description: 'Mainstream green industrial production and sustainable trade practices into MIT policies, programs and regulatory frameworks in alignment with national and international environmental standards.',
    outcomes: [
      {
        id: 'oc-X1', orderNo: 1,
        name: 'Environmentally sustainable industrial production and trade practices adopted',
        outputs: [
          {
            id: 'op-X1-1', orderNo: 1,
            name: 'Green industrial production and sustainable trade practices mainstreamed',
            activities: [
              { id: 'act-X1-1-1', orderNo: 1, name: 'Increase number of enterprises certified for environmental compliance' },
              { id: 'act-X1-1-2', orderNo: 2, name: 'Implement environmental sustainability monitoring in key industrial sectors' },
            ],
            indicators: [
              {
                code: 'ENV-X-01', name: 'Number of industrial enterprises adopting environmentally sustainable production practices',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'TBS / MIT Environmental Compliance Records',
                responsiblePerson: 'Environmental Focal Person',
                reportingFrequency: 'annual', baselineValue: 45, baselineYear: 2024,
                institutionCode: 'TBS',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 60 },
                actuals: {},
              },
              {
                code: 'ENV-X-02', name: 'Number of domestically produced goods meeting recognized environmental/green certification standards',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'TBS Green Certification Records',
                responsiblePerson: 'TBS Director General',
                reportingFrequency: 'annual', baselineValue: 12, baselineYear: 2024,
                institutionCode: 'TBS',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 20 },
                actuals: {},
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // OBJECTIVE Y (Crosscutting)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'so-Y', orderNo: 8,
    name: 'Multi-sectoral Nutritional Services Improved',
    description: 'Mainstream nutrition priorities into MIT industrial and trade programs; promote food fortification among MSMEs and food processors; and support nutritional well-being of MIT staff.',
    outcomes: [
      {
        id: 'oc-Y1', orderNo: 1,
        name: 'Nutrition-sensitive industrial development promoted and MSMEs engaged in food fortification',
        outputs: [
          {
            id: 'op-Y1-1', orderNo: 1,
            name: 'MSME and food processor engagement in food fortification increased',
            activities: [
              { id: 'act-Y1-1-1', orderNo: 1, name: 'Implement integrated staff nutrition enhancement programs at MIT' },
              { id: 'act-Y1-1-2', orderNo: 2, name: 'Engage MSMEs and food processors in food fortification programs' },
              { id: 'act-Y1-1-3', orderNo: 3, name: 'Conduct nutrition awareness campaigns and quarterly staff health screenings' },
            ],
            indicators: [
              {
                code: 'NUT-Y-01', name: 'Number of MSMEs and food processors engaged in food fortification',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT / SIDO Food Fortification Program Records',
                responsiblePerson: 'Director of SME Development',
                reportingFrequency: 'quarterly', baselineValue: 33721, baselineYear: 2024,
                institutionCode: 'SIDO',
                targets: { q1: 500, q2: 500, q3: 500, q4: 500, annual: 2000 },
                actuals: { Q1: 520, Q2: 490 },
              },
              {
                code: 'NUT-Y-02', name: 'Number of MIT staff nutrition innovations adopted and health risk appraisals conducted',
                unit: 'Number', formulaType: 'achievement_pct',
                formulaConfig: { baselineField: 'baselineValue', actualField: 'actualValue', targetField: 'target' },
                dataSource: 'MIT HR / Health and Wellness Records',
                responsiblePerson: 'Head of Human Resources and Administration',
                reportingFrequency: 'annual', baselineValue: 1, baselineYear: 2024,
                institutionCode: 'MIT-HQ',
                targets: { q1: null, q2: null, q3: null, q4: null, annual: 1 },
                actuals: {},
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── BUDGET SEED DATA ─────────────────────────────────────────────────────────
const budgetSeeds = [
  { activityId: 'act-C1-1-1', code: 'TIRDO',    q1: 50000000,  q2: 50000000,  q3: 50000000,  q4: 50000000,  annual: 200000000,  source: 'Government Budget' },
  { activityId: 'act-C2-1-2', code: 'SIDO',     q1: 120000000, q2: 120000000, q3: 120000000, q4: 120000000, annual: 480000000,  source: 'Government Budget' },
  { activityId: 'act-E1-1-1', code: 'TANTRADE', q1: 200000000, q2: 200000000, q3: 200000000, q4: 200000000, annual: 800000000,  source: 'Government Budget' },
  { activityId: 'act-D1-1-1', code: 'BRELA',    q1: 80000000,  q2: 80000000,  q3: 80000000,  q4: 80000000,  annual: 320000000,  source: 'Government Budget' },
  { activityId: 'act-E2-1-1', code: 'TBS',      q1: 60000000,  q2: 60000000,  q3: 60000000,  q4: 60000000,  annual: 240000000,  source: 'Government Budget' },
  { activityId: 'act-C3-1-1', code: 'NDC',      q1: 150000000, q2: 150000000, q3: 150000000, q4: 150000000, annual: 600000000,  source: 'Government Budget' },
  { activityId: 'act-F1-1-1', code: 'MIT-HQ',   q1: 30000000,  q2: 30000000,  q3: 30000000,  q4: 30000000,  annual: 120000000,  source: 'Government Budget' },
];

const expenditureSeeds = [
  { activityId: 'act-C1-1-1', code: 'TIRDO',    period: 'Q1', amount: 44000000,  desc: 'Q1 Research project costs and laboratory supplies', status: 'approved' },
  { activityId: 'act-C2-1-2', code: 'SIDO',     period: 'Q1', amount: 108000000, desc: 'Q1 SME training workshops — 6 regions', status: 'approved' },
  { activityId: 'act-E1-1-1', code: 'TANTRADE', period: 'Q1', amount: 185000000, desc: 'Q1 International trade fair participation costs', status: 'approved' },
  { activityId: 'act-D1-1-1', code: 'BRELA',    period: 'Q1', amount: 72000000,  desc: 'Q1 BRS system upgrade and digital registration rollout', status: 'submitted' },
  { activityId: 'act-E2-1-1', code: 'TBS',      period: 'Q1', amount: 55000000,  desc: 'Q1 Standards development workshops and laboratory costs', status: 'submitted' },
  { activityId: 'act-C3-1-1', code: 'NDC',      period: 'Q1', amount: 140000000, desc: 'Q1 Investment facilitation and feasibility study costs', status: 'approved' },
  { activityId: 'act-F1-1-1', code: 'MIT-HQ',   period: 'Q1', amount: 26000000,  desc: 'Q1 Staff training programs — short courses', status: 'approved' },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  MIT M&E System — Full Reseed (Strategic Plan Aligned)');
  console.log('═══════════════════════════════════════════════════\n');

  const FY = '2025-2026';
  const defaultPassword = 'Passw0rd@MIT';

  // ── 1. INSTITUTIONS ──────────────────────────────────────────────────────────
  console.log('📦 Creating institutions...');
  const instMap = {};
  for (const inst of institutions) {
    const created = await prisma.institution.upsert({
      where: { code: inst.code },
      update: { name: inst.name, region: inst.region },
      create: inst,
    });
    instMap[inst.code] = created;
    console.log(`   ✓ ${created.code.padEnd(9)} ${created.name}`);
  }
  const hq = instMap['MIT-HQ'];

  // ── 2. SYSTEM USERS ──────────────────────────────────────────────────────────
  console.log('\n👤 Creating system admin users...');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@mit.go.tz' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@mit.go.tz',
      passwordHash: await bcrypt.hash('Admin@1234', 12),
      role: 'super_admin',
      institutionId: hq.id,
    },
  });
  console.log(`   ✓ Super Admin: ${superAdmin.email}`);

  const meNational = await prisma.user.upsert({
    where: { email: 'me.national@mit.go.tz' },
    update: {},
    create: {
      name: 'National M&E Officer',
      email: 'me.national@mit.go.tz',
      passwordHash: await bcrypt.hash('Officer@1234', 12),
      role: 'me_officer',
      institutionId: hq.id,
    },
  });
  console.log(`   ✓ National M&E Officer: ${meNational.email}`);

  // ── 3. MIT DEPARTMENT USERS ───────────────────────────────────────────────────
  console.log('\n🏛️  Creating MIT departments and units users...');
  // Build department code → id map
  const allDepts = await prisma.department.findMany({ select: { id: true, code: true } });
  const deptIdByCode = Object.fromEntries(allDepts.map(d => [d.code, d.id]));

  const deptUserMap = {};
  for (const u of mitDepartments) {
    const deptId = deptIdByCode[u.deptCode] || null;
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: { departmentId: deptId },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: await bcrypt.hash(defaultPassword, 12),
        role: u.role,
        institutionId: hq.id,
        departmentId: deptId,
      },
    });
    deptUserMap[u.email] = created;
    console.log(`   ✓ [${u.role.padEnd(14)}] ${u.name}  [${u.deptCode}]`);
  }

  // Get the me_officer user for the M&E unit (used for approvals)
  const meOfficer = deptUserMap['meu.officer@mit.go.tz'] || deptUserMap['meu.head@mit.go.tz'] || meNational;

  // ── 4. AGENCY USERS ───────────────────────────────────────────────────────────
  console.log('\n🏢 Creating agency users...');
  const agencyUserMap = {};
  for (const u of agencyUsers) {
    const inst = instMap[u.code];
    if (!inst) { console.warn(`   ⚠ Institution ${u.code} not found`); continue; }
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash: await bcrypt.hash(defaultPassword, 12),
        role: u.role,
        institutionId: inst.id,
      },
    });
    agencyUserMap[`${u.code}_${u.role}`] = created;
    console.log(`   ✓ [${u.code.padEnd(9)}] [${u.role.padEnd(14)}] ${u.email}`);
  }

  const getSubmitter = (code) =>
    agencyUserMap[`${code}_data_collector`] ||
    agencyUserMap[`${code}_me_officer`] ||
    agencyUserMap[`${code}_admin`] ||
    superAdmin;

  const getApprover = (code) =>
    agencyUserMap[`${code}_admin`] ||
    agencyUserMap[`${code}_me_officer`] ||
    superAdmin;

  // ── 5. RESULTS FRAMEWORK ──────────────────────────────────────────────────────
  console.log('\n🌳 Building Results Framework (MIT Strategic Plan 2026/27–2030/31)...');
  const indicatorMap = {};

  for (const so of framework) {
    const objective = await prisma.strategicObjective.upsert({
      where: { id: so.id },
      update: { name: so.name, description: so.description, orderNo: so.orderNo },
      create: { id: so.id, name: so.name, description: so.description, orderNo: so.orderNo },
    });
    console.log(`\n   📌 OBJECTIVE ${so.id.replace('so-','')}: ${so.name.substring(0, 65)}...`);

    for (const oc of so.outcomes) {
      const outcome = await prisma.outcome.upsert({
        where: { id: oc.id },
        update: { name: oc.name, description: oc.description || null, orderNo: oc.orderNo },
        create: { id: oc.id, objectiveId: objective.id, name: oc.name, description: oc.description || null, orderNo: oc.orderNo },
      });

      for (const op of oc.outputs) {
        const output = await prisma.output.upsert({
          where: { id: op.id },
          update: { name: op.name, orderNo: op.orderNo },
          create: { id: op.id, outcomeId: outcome.id, name: op.name, orderNo: op.orderNo },
        });
        console.log(`      ↳ ${op.name.substring(0, 70)}`);

        for (const act of op.activities) {
          await prisma.activity.upsert({
            where: { id: act.id },
            update: { name: act.name, orderNo: act.orderNo, isCritical: act.isCritical || false },
            create: { id: act.id, outputId: output.id, name: act.name, orderNo: act.orderNo, isCritical: act.isCritical || false },
          });
        }

        for (const ind of op.indicators) {
          const indicator = await prisma.indicator.upsert({
            where: { code: ind.code },
            update: {
              name: ind.name, unit: ind.unit, formulaType: ind.formulaType,
              formulaConfig: ind.formulaConfig, dataSource: ind.dataSource,
              responsiblePerson: ind.responsiblePerson, reportingFrequency: ind.reportingFrequency,
              baselineValue: ind.baselineValue, baselineYear: ind.baselineYear,
            },
            create: {
              outputId: output.id, name: ind.name, code: ind.code,
              unit: ind.unit, formulaType: ind.formulaType, formulaConfig: ind.formulaConfig,
              dataSource: ind.dataSource, responsiblePerson: ind.responsiblePerson,
              reportingFrequency: ind.reportingFrequency,
              baselineValue: ind.baselineValue, baselineYear: ind.baselineYear,
              createdById: superAdmin.id,
            },
          });
          indicatorMap[ind.code] = { indicator, institutionCode: ind.institutionCode, targets: ind.targets, actuals: ind.actuals };
          console.log(`         📊 [${ind.code}] ${ind.name.substring(0, 55)}`);
        }
      }
    }
  }

  // ── 6. INDICATOR TARGETS ──────────────────────────────────────────────────────
  console.log('\n🎯 Setting FY ' + FY + ' targets...');
  for (const [code, { indicator, institutionCode, targets }] of Object.entries(indicatorMap)) {
    const inst = instMap[institutionCode];
    if (!inst) continue;
    await prisma.indicatorTarget.upsert({
      where: { indicatorId_institutionId_fiscalYear: { indicatorId: indicator.id, institutionId: inst.id, fiscalYear: FY } },
      update: { q1Target: targets.q1, q2Target: targets.q2, q3Target: targets.q3, q4Target: targets.q4, annualTarget: targets.annual },
      create: {
        indicatorId: indicator.id, institutionId: inst.id, fiscalYear: FY,
        q1Target: targets.q1, q2Target: targets.q2, q3Target: targets.q3,
        q4Target: targets.q4, annualTarget: targets.annual,
      },
    });
    console.log(`   ✓ ${code} → ${institutionCode} | Annual: ${targets.annual}`);
  }

  // ── 7. Q1 ACTUALS ─────────────────────────────────────────────────────────────
  console.log('\n📥 Submitting Q1 2025-2026 actuals...');
  for (const [code, { indicator, institutionCode, actuals }] of Object.entries(indicatorMap)) {
    if (!actuals.Q1 && actuals.Q1 !== 0) continue;
    const inst = instMap[institutionCode];
    if (!inst) continue;
    const submitter = getSubmitter(institutionCode);
    await prisma.indicatorActual.upsert({
      where: {
        indicatorId_institutionId_fiscalYear_reportingPeriod: {
          indicatorId: indicator.id, institutionId: inst.id,
          fiscalYear: FY, reportingPeriod: 'Q1',
        },
      },
      update: { actualValue: actuals.Q1, status: 'approved', approvedById: meOfficer.id, approvedAt: new Date('2025-10-30') },
      create: {
        indicatorId: indicator.id, institutionId: inst.id,
        fiscalYear: FY, reportingPeriod: 'Q1',
        actualValue: actuals.Q1,
        submittedById: submitter.id, submittedAt: new Date('2025-10-25'),
        status: 'approved', approvedById: meOfficer.id, approvedAt: new Date('2025-10-30'),
        remarks: 'Q1 performance verified and approved',
      },
    });
    console.log(`   ✓ ${code.padEnd(15)} Q1 = ${actuals.Q1} [approved]`);
  }

  // ── 7b. Q2 ACTUALS ────────────────────────────────────────────────────────────
  console.log('\n📥 Submitting Q2 2025-2026 actuals...');
  for (const [code, { indicator, institutionCode, actuals }] of Object.entries(indicatorMap)) {
    if (!actuals.Q2 && actuals.Q2 !== 0) continue;
    const inst = instMap[institutionCode];
    if (!inst) continue;
    const submitter = getSubmitter(institutionCode);
    await prisma.indicatorActual.upsert({
      where: {
        indicatorId_institutionId_fiscalYear_reportingPeriod: {
          indicatorId: indicator.id, institutionId: inst.id,
          fiscalYear: FY, reportingPeriod: 'Q2',
        },
      },
      update: { actualValue: actuals.Q2, status: 'approved', approvedById: meOfficer.id, approvedAt: new Date('2026-01-30') },
      create: {
        indicatorId: indicator.id, institutionId: inst.id,
        fiscalYear: FY, reportingPeriod: 'Q2',
        actualValue: actuals.Q2,
        submittedById: submitter.id, submittedAt: new Date('2026-01-25'),
        status: 'approved', approvedById: meOfficer.id, approvedAt: new Date('2026-01-30'),
        remarks: 'Q2 performance verified and approved',
      },
    });
    console.log(`   ✓ ${code.padEnd(15)} Q2 = ${actuals.Q2} [approved]`);
  }

  // ── 8. BUDGETS AND EXPENDITURES ───────────────────────────────────────────────
  console.log('\n💰 Creating budget plans and Q1 expenditures...');
  for (const b of budgetSeeds) {
    const inst = instMap[b.code];
    if (!inst) continue;
    let plan;
    try {
      plan = await prisma.budgetPlan.upsert({
        where: { activityId_institutionId_fiscalYear: { activityId: b.activityId, institutionId: inst.id, fiscalYear: FY } },
        update: { q1Budget: b.q1, q2Budget: b.q2, q3Budget: b.q3, q4Budget: b.q4, totalBudget: b.annual },
        create: {
          activityId: b.activityId, institutionId: inst.id, fiscalYear: FY,
          q1Budget: b.q1, q2Budget: b.q2, q3Budget: b.q3, q4Budget: b.q4,
          totalBudget: b.annual, fundingSource: b.source, currency: 'TZS',
        },
      });
      console.log(`   ✓ Budget: ${b.code.padEnd(9)} ${b.activityId} = TZS ${b.annual.toLocaleString()}`);
    } catch (e) {
      console.warn(`   ⚠ Budget skipped: ${e.message.substring(0, 80)}`);
      continue;
    }
    const exp = expenditureSeeds.find(e => e.activityId === b.activityId && e.code === b.code);
    if (exp && plan) {
      const submitter = getSubmitter(b.code);
      const approver = getApprover(b.code);
      try {
        await prisma.expenditure.create({
          data: {
            budgetPlanId: plan.id, institutionId: inst.id, period: 'Q1',
            amount: exp.amount, description: exp.desc,
            submittedById: submitter.id,
            status: exp.status === 'approved' ? 'approved' : 'submitted',
            approvedById: exp.status === 'approved' ? approver.id : null,
            approvedAt: exp.status === 'approved' ? new Date('2025-10-30') : null,
          },
        });
        console.log(`      └─ Expenditure Q1: TZS ${exp.amount.toLocaleString()} [${exp.status}]`);
      } catch (e) {
        console.warn(`      └─ Expenditure skipped: ${e.message.substring(0, 60)}`);
      }
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────────
  const counts = {
    institutions: await prisma.institution.count(),
    users: await prisma.user.count(),
    objectives: await prisma.strategicObjective.count(),
    outcomes: await prisma.outcome.count(),
    outputs: await prisma.output.count(),
    activities: await prisma.activity.count(),
    indicators: await prisma.indicator.count(),
    targets: await prisma.indicatorTarget.count(),
    actuals: await prisma.indicatorActual.count(),
    budgets: await prisma.budgetPlan.count(),
    expenditures: await prisma.expenditure.count(),
  };

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅  Seed Complete — Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Institutions:           ${counts.institutions}  (MIT-HQ + 13 agencies)`);
  console.log(`  Users:                  ${counts.users}  (Super Admin + MIT Depts + Agency Staff)`);
  console.log(`  Strategic Objectives:   ${counts.objectives}  (A, B, C, D, E, F, X, Y)`);
  console.log(`  Outcomes:               ${counts.outcomes}`);
  console.log(`  Outputs:                ${counts.outputs}`);
  console.log(`  Activities:             ${counts.activities}`);
  console.log(`  Indicators:             ${counts.indicators}`);
  console.log(`  Indicator Targets:      ${counts.targets}`);
  console.log(`  Indicator Actuals:      ${counts.actuals}  (Q1 & Q2 FY2025-2026, all approved)`);
  console.log(`  Budget Plans:           ${counts.budgets}`);
  console.log(`  Expenditures:           ${counts.expenditures}`);
  console.log('───────────────────────────────────────────────────');
  console.log('  MIT STRATEGIC PLAN OBJECTIVES (2026/27–2030/31)');
  console.log('───────────────────────────────────────────────────');
  console.log('  A: HIV/AIDS and NCDs (crosscutting)');
  console.log('  B: Anti-Corruption Strategy (crosscutting)');
  console.log('  C: Industrial Performance (core function)');
  console.log('  D: Business Environment (core function)');
  console.log('  E: Trade and Market Competitiveness (core function)');
  console.log('  F: Institutional Capacity (core function)');
  console.log('  X: Environment and Ecosystems (crosscutting)');
  console.log('  Y: Multi-sectoral Nutrition (crosscutting)');
  console.log('───────────────────────────────────────────────────');
  console.log('  LOGIN CREDENTIALS');
  console.log('───────────────────────────────────────────────────');
  console.log('  Super Admin:    admin@mit.go.tz           / Admin@1234');
  console.log('  MEU Head:       meu.head@mit.go.tz         / Passw0rd@MIT');
  console.log('  MEU Officer:    meu.officer@mit.go.tz      / Passw0rd@MIT');
  console.log('  DPP Director:   dpp.director@mit.go.tz     / Passw0rd@MIT');
  console.log('  DTD Director:   dtd.director@mit.go.tz     / Passw0rd@MIT');
  console.log('  DTI Director:   dti.director@mit.go.tz     / Passw0rd@MIT');
  console.log('  DSME Director:  dsme.director@mit.go.tz    / Passw0rd@MIT');
  console.log('  BRELA Admin:    admin@brela.go.tz           / Passw0rd@MIT');
  console.log('  SIDO Data:      data@sido.go.tz            / Passw0rd@MIT');
  console.log('  TBS M&E:        me.officer@tbs.go.tz       / Passw0rd@MIT');
  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
