// Seed data for Strategic Objectives (7 Flagships from Dira ya Taifa 2050)
// File: prisma/seeds/seed-strategic-objectives.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedStrategicObjectives() {
  console.log('Starting seed: Strategic Objectives (7 Flagships)...\n');

  const strategicObjectives = [
    {
      code: 'SO-001',
      name: 'Bagamoyo Eco-Maritime City',
      priority_level: 1,
      description: 'Maritime logistics and export gateway, export-oriented manufacturing, multi-modal logistics hub, marine engineering industries, and coastal economy development.',
      vision_statement: 'Transform Bagamoyo into a world-class maritime industrial hub supporting Tanzania\'s export growth and regional trade leadership.',
      flagship_badge: 'Maritime & Export Excellence',
      key_focus_areas: JSON.stringify([
        'Maritime logistics and export gateway',
        'Export-oriented manufacturing',
        'Multi-modal logistics hub',
        'Marine engineering industries',
        'Tourism and coastal economy',
        'Industrial SEZ development',
        'SME integration into export value chains'
      ]),
      geographical_focus: 'Coastal Region - Bagamoyo',
      estimated_investment_usd: 2500000000,
      target_completion_year: 2050,
      status: 'active'
    },
    {
      code: 'SO-002',
      name: 'Liganga–Mchuchuma Iron & Steel Complex',
      priority_level: 2,
      description: 'Strategic industrial materials platform for metallurgy and alloys production, domestic steel production, downstream metal manufacturing, and engineering services ecosystem.',
      vision_statement: 'Establish Tanzania as a regional leader in steel production and metal manufacturing, supporting industrialization and value addition.',
      flagship_badge: 'Industrial Materials',
      key_focus_areas: JSON.stringify([
        'Strategic industrial materials platform',
        'Metallurgy and alloys industries',
        'Domestic steel production',
        'Downstream metal manufacturing',
        'Engineering services ecosystem',
        'Manufacturing value chain development',
        'Industrial clusters for metal industries',
        'SME integration into engineering services'
      ]),
      geographical_focus: 'Southern Highlands - Mbeya Region',
      estimated_investment_usd: 3000000000,
      target_completion_year: 2050,
      status: 'active'
    },
    {
      code: 'SO-003',
      name: 'National Irrigation & Agro-Industrial Transformation',
      priority_level: 3,
      description: 'Large-scale agro-processing development including irrigation expansion, agro-processing industrial parks, edible oil production, grain processing clusters, and agro-logistics with cold chains.',
      vision_statement: 'Unlock Tanzania\'s agricultural potential through industrialization, value addition, and export-oriented agro-processing.',
      flagship_badge: 'Agro-Industry Growth',
      key_focus_areas: JSON.stringify([
        'Irrigation expansion',
        'Agro-processing industrial parks',
        'Edible oil production',
        'Grain processing clusters',
        'Agro-logistics including cold chains',
        'Oilseed processing expansion',
        'Food processing clusters',
        'SME participation in agro-industry'
      ]),
      geographical_focus: 'Multiple Regions - High Potential Areas',
      estimated_investment_usd: 2200000000,
      target_completion_year: 2050,
      status: 'active'
    },
    {
      code: 'SO-004',
      name: 'Dodoma Mineral Silicon Valley',
      priority_level: 4,
      description: 'Mineral beneficiation industries focusing on critical minerals (Lithium, Cobalt, Graphite, Helium, Nickel) processing, battery and green technology manufacturing, and industrial research and innovation ecosystems.',
      vision_statement: 'Position Tanzania as a global leader in green technology and battery manufacturing through strategic mineral processing.',
      flagship_badge: 'Green Tech Innovation',
      key_focus_areas: JSON.stringify([
        'Mineral beneficiation industries',
        'Lithium, Cobalt, Graphite, Helium & Nickel processing',
        'Battery and green technology manufacturing',
        'Industrial research and innovation ecosystems',
        'Technology transfer and innovation',
        'SME participation in green industries'
      ]),
      geographical_focus: 'Central Region - Dodoma',
      estimated_investment_usd: 1800000000,
      target_completion_year: 2050,
      status: 'active'
    },
    {
      code: 'SO-005',
      name: 'LNG Industrialisation Platform',
      priority_level: 5,
      description: 'Gas-based industrialization platform for fertilizer production, petrochemical industries, industrial chemicals production, and gas-based industrial parks.',
      vision_statement: 'Harness Tanzania\'s natural gas resources for industrial development, job creation, and value-added manufacturing.',
      flagship_badge: 'Energy-Based Manufacturing',
      key_focus_areas: JSON.stringify([
        'Gas-based industrialisation',
        'Fertilizer production',
        'Petrochemical industries',
        'Industrial chemicals production',
        'Gas-based industrial parks',
        'Legislative and policy frameworks for gas utilisation',
        'Industrial investment attraction'
      ]),
      geographical_focus: 'Southern Coast - Mtwara/Lindi',
      estimated_investment_usd: 3500000000,
      target_completion_year: 2050,
      status: 'active'
    },
    {
      code: 'SO-006',
      name: 'Great Lakes Smart Industrial Hub',
      priority_level: 6,
      description: 'Regional blue economy hub including fisheries industries, agro-processing for regional markets, gold refining and minerals value chains, regional trade logistics hubs, and textile and pharmaceutical manufacturing.',
      vision_statement: 'Develop Great Lakes region as a competitive regional trade and industrial hub supporting East African integration.',
      flagship_badge: 'Blue Economy & Trade',
      key_focus_areas: JSON.stringify([
        'Broad blue economy including fisheries industries',
        'Agro-processing for regional markets',
        'Gold refining and minerals value chains',
        'Regional trade logistics hubs',
        'Textile and pharmaceutical manufacturing',
        'Export promotion and regional trade integration',
        'Cross-border trade facilitation',
        'SME integration in regional value chains'
      ]),
      geographical_focus: 'Lake Regions - Kagera, Kigoma, Mwanza',
      estimated_investment_usd: 1500000000,
      target_completion_year: 2050,
      status: 'active'
    },
    {
      code: 'SO-007',
      name: 'Tanzania Urban Growth Nexus',
      priority_level: 7,
      description: 'Urban industrial development featuring urban industrial districts, innovation ecosystems, logistics and e-commerce hubs, SME development platforms, and smart city systems.',
      vision_statement: 'Create thriving urban industrial centers that attract investment, foster innovation, and provide inclusive economic opportunities.',
      flagship_badge: 'Smart Urbanization',
      key_focus_areas: JSON.stringify([
        'Urban industrial districts',
        'Innovation ecosystems',
        'Logistics and e-commerce hubs',
        'SME development platforms',
        'Smart city systems',
        'SME incubation systems and centers',
        'Digital trade mechanisms',
        'Urban Industrial Zones'
      ]),
      geographical_focus: 'Multiple Urban Centers',
      estimated_investment_usd: 1200000000,
      target_completion_year: 2050,
      status: 'active'
    }
  ];

  // Insert strategic objectives
  for (const objective of strategicObjectives) {
    try {
      const created = await prisma.strategicObjectiveDira.create({
        data: objective
      });
      console.log(`✓ Created: ${created.name} (${created.code})`);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`⚠ Already exists: ${objective.name} (${objective.code})`);
      } else {
        console.error(`✗ Error creating ${objective.name}:`, error.message);
      }
    }
  }

  console.log('\n---\n');
  console.log('Starting seed: Foundational Reforms...\n');

  const foundationalReforms = [
    {
      code: 'FR-001',
      name: 'Fair Competition Commission - M&A Framework',
      institution_responsible: 'Fair Competition Commission (FCC)',
      issue_addressed: 'Capital threshold for mergers & acquisitions disadvantages SMEs and differs from regional practice',
      description: 'Amend FCC Act/Regulations to adopt deal value as the primary merger assessment threshold instead of capital-based threshold.',
      recommendations: 'Update legislation to align with regional practice (deal value vs. capital threshold)',
      status: 'active',
      target_completion_date: new Date('2027-06-30')
    },
    {
      code: 'FR-002',
      name: 'Business Registration - Limited Liability Partnership',
      institution_responsible: 'BRELA (Business Registrations and Licensing Agency)',
      issue_addressed: 'Absence of Limited Liability Partnership (LLP) framework creates personal liability for partners',
      description: 'Amend Companies Act to introduce and operationalize an LLP framework, enabling partnership structures without personal liability.',
      recommendations: 'Implement LLP framework to encourage business partnerships and reduce risk',
      status: 'active',
      target_completion_date: new Date('2027-12-31')
    },
    {
      code: 'FR-003',
      name: 'Industrial and Market Intelligence Unit',
      institution_responsible: 'MIT / TanTrade',
      issue_addressed: 'No integrated market intelligence system for demand, prices, competitiveness, trade opportunities',
      description: 'Establish integrated market intelligence unit with trade data analytics, deployment of trade attachés, and market research capabilities.',
      recommendations: 'Benchmark best practice; establish the unit; train experts; deploy trade attachés',
      status: 'active',
      target_completion_date: new Date('2027-06-30')
    },
    {
      code: 'FR-004',
      name: 'SME Certification and Standards Access',
      institution_responsible: 'Ministry / TBS / SIDO / TIRDO',
      issue_addressed: 'Limited local access to certification services raises SME costs and discourages formalization',
      description: 'Bring TBS/regulatory services closer to SMEs through regional pilots, reducing barriers to compliance.',
      recommendations: 'Start with regional pilots before national rollout of certification services',
      status: 'active',
      target_completion_date: new Date('2026-12-31')
    },
    {
      code: 'FR-005',
      name: 'SME Upgrading and Value Chain Integration',
      institution_responsible: 'SIDO / TEMDO / TIRDO / CAMARTEC',
      issue_addressed: 'SMEs lack capacity to participate in strategic project value chains',
      description: 'Develop comprehensive SME upgrading strategies covering finance, technical, and managerial capacity with mandatory knowledge transfer.',
      recommendations: 'Create SME upgrading programs linked to flagship projects (especially LPG opportunities)',
      status: 'active',
      target_completion_date: new Date('2027-06-30')
    },
    {
      code: 'FR-006',
      name: 'National Development Corporation Strengthening',
      institution_responsible: 'NDC (National Development Corporation)',
      issue_addressed: 'NDC underperformance in managing strategic industrial investments',
      description: 'Finalize NDC Act, strengthen commercial mandate, and establish SPVs/subsidiaries focused on priority strategic sectors.',
      recommendations: 'Strengthen NDC as central vehicle for strategic industrial investment implementation',
      status: 'active',
      target_completion_date: new Date('2027-12-31')
    }
  ];

  // Insert foundational reforms
  for (const reform of foundationalReforms) {
    try {
      const created = await prisma.foundationalReform.create({
        data: reform
      });
      console.log(`✓ Created: ${created.name} (${created.code})`);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`⚠ Already exists: ${reform.name} (${reform.code})`);
      } else {
        console.error(`✗ Error creating ${reform.name}:`, error.message);
      }
    }
  }

  console.log('\n✓ Seed completed successfully!');
}

seedStrategicObjectives()
  .catch(e => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
