// ── MIT Administration Structure & Annual Plan Data (FY 2025/2026) ────────────

export const DEPT_META = {
  DAHRM: { type: 'department', color: 'bg-blue-50 border-blue-200',      textColor: 'text-blue-700',    icon: '🏛️', label: 'Dept of Admin & HRM' },
  DID:   { type: 'department', color: 'bg-indigo-50 border-indigo-200',  textColor: 'text-indigo-700',  icon: '🏭', label: 'Dept of Industrial Development' },
  DPP:   { type: 'department', color: 'bg-violet-50 border-violet-200',  textColor: 'text-violet-700',  icon: '📋', label: 'Dept of Policy & Planning' },
  DTD:   { type: 'department', color: 'bg-sky-50 border-sky-200',        textColor: 'text-sky-700',     icon: '🤝', label: 'Dept of Trade Development' },
  DSME:  { type: 'department', color: 'bg-teal-50 border-teal-200',      textColor: 'text-teal-700',    icon: '🏪', label: 'Dept of SMEs' },
  DTI:   { type: 'department', color: 'bg-cyan-50 border-cyan-200',      textColor: 'text-cyan-700',    icon: '🌐', label: 'Dept of Trade Integration' },
  FAU:   { type: 'unit',       color: 'bg-amber-50 border-amber-200',    textColor: 'text-amber-700',   icon: '💰', label: 'Finance & Accounting Unit' },
  PMU:   { type: 'unit',       color: 'bg-orange-50 border-orange-200',  textColor: 'text-orange-700',  icon: '📦', label: 'Procurement Management Unit' },
  LSU:   { type: 'unit',       color: 'bg-rose-50 border-rose-200',      textColor: 'text-rose-700',    icon: '⚖️',  label: 'Legal Services Unit' },
  ICTU:  { type: 'unit',       color: 'bg-emerald-50 border-emerald-200',textColor: 'text-emerald-700', icon: '💻', label: 'ICT Unit' },
  GCU:   { type: 'unit',       color: 'bg-lime-50 border-lime-200',      textColor: 'text-lime-700',    icon: '📢', label: 'Government Communication Unit' },
  IAU:   { type: 'unit',       color: 'bg-yellow-50 border-yellow-200',  textColor: 'text-yellow-700',  icon: '🔍', label: 'Internal Audit Unit' },
  MEU:   { type: 'unit',       color: 'bg-pink-50 border-pink-200',      textColor: 'text-pink-700',    icon: '📊', label: 'Monitoring & Evaluation Unit' },
};

// Objective meta (national objectives)
export const OBJ_META = {
  A: { name: 'HIV/AIDS Infections and NCDs Reduced',             color: 'bg-red-100 text-red-800',     border: 'border-red-300' },
  B: { name: 'Anti-Corruption Strategy Enhanced',               color: 'bg-orange-100 text-orange-800', border: 'border-orange-300' },
  C: { name: 'Industrial Performance Improved and Sustained',   color: 'bg-blue-100 text-blue-800',   border: 'border-blue-300' },
  D: { name: 'Business Environment Improved',                   color: 'bg-green-100 text-green-800', border: 'border-green-300' },
  E: { name: 'Trade and Market Competitiveness Enhanced',       color: 'bg-purple-100 text-purple-800', border: 'border-purple-300' },
  F: { name: 'Ministry Capacity to Deliver Mandated Functions Improved', color: 'bg-slate-100 text-slate-800', border: 'border-slate-300' },
  X: { name: 'Cross-Cutting Issues Addressed',                  color: 'bg-cyan-100 text-cyan-800',   border: 'border-cyan-300' },
  Y: { name: 'Multi-Sectoral Nutritional Services Improved',    color: 'bg-lime-100 text-lime-800',   border: 'border-lime-300' },
};

// Outcome labels per objective (mapped from strategic plan)
export const OUTCOME_MAP = {
  A: 'Improved health and welfare of MIT staff',
  B: 'Transparent and accountable governance culture established',
  C: 'Increased industrial output and value addition',
  D: 'Streamlined business regulatory environment',
  E: 'Expanded market access and competitive trade',
  F: 'Enhanced organizational efficiency and staff capacity',
  X: 'Mainstreamed cross-cutting issues in MIT operations',
  Y: 'Improved nutritional outcomes through SME engagement',
};

const fmt = n => n >= 1e9 ? `${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : (n?.toLocaleString() ?? '0');
export { fmt };

// Full MIT Annual Plan data per dept/unit (FY 2025/2026)
export const DEPT_DATA = {
  DAHRM: {
    subVote: '1001', budget: 5600000000,
    objectives: [
      {
        code: 'A', name: 'HIV/AIDS Infections and Non Communicable Diseases Reduced and Supportive Services Improved',
        outputs: [
          { code: 'A03S', name: 'HIV/AIDS and Non-Communicable diseases intervention programmes implemented by June 2026', budget: 347750000,
            activities: [
              { code: 'A03S01', name: 'To support six (6) staff affected by HIV/AIDS with balanced diet, transportation, and provision of protective materials for non-communicable diseases by June 2026', budget: 25700000 },
              { code: 'A03S02', name: 'To hold four (4) meetings of the Ministerial Technical HIV/AIDS and non-communicable diseases committee by June 2026', budget: 23150000 },
              { code: 'A03S03', name: 'To conduct two (2) seminars on HIV/AIDS and non-communicable diseases for two hundred (200) MIT staff', budget: 27550000 },
              { code: 'A03S04', name: 'To facilitate MIT staffs with medical insurance and to attend seminars and workshops on NCD & CD issues by June 2026', budget: 271350000 },
            ],
          },
        ],
      },
      {
        code: 'B', name: 'Implementation of National Anti-Corruption Strategy enhanced and sustained',
        outputs: [
          { code: 'B01S', name: 'Anti-corruption Programme implemented by June 2026', budget: 39800000,
            activities: [
              { code: 'B01S01', name: 'To conduct two (2) stakeholder meetings on anti-corruption at MIT by June 2026', budget: 13300000 },
              { code: 'B01S02', name: 'To develop an MIT anti-corruption action plan and prepare a national anti-corruption strategy at MIT by June 2026', budget: 19000000 },
              { code: 'B01S03', name: 'To enhance the anti-corruption-free zone at MIT by June 2026', budget: 7500000 },
            ],
          },
          { code: 'B02S', name: 'Public Service Code of conducts and good practice guidelines implemented by June 2026', budget: 64900000,
            activities: [
              { code: 'B02S01', name: 'To conduct two (2) seminars on ethical conduct, corruption, and good governance for two hundred (200) employees by June 2026', budget: 31500000 },
              { code: 'B02S02', name: 'To hold four (4) meetings for the Ministerial Integrity Committee and to facilitate Disciplinary Committee matters by June 2026', budget: 29700000 },
              { code: 'B02S03', name: 'To facilitate the availability of public service ethical guidelines, rules, regulations, laws, and circulars by June 2026', budget: 3700000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01S', name: 'Human Resource Development Plan implemented by June 2026', budget: 238600000,
            activities: [
              { code: 'F01S01', name: 'To review the MIT job listing, leave the roster, seniority list, and retirement roster by June 2026', budget: 27700000 },
              { code: 'F01S02', name: 'To prepare and submit Personnel Emoluments (PE) estimates to the President\'s Office by June 2026', budget: 39000000 },
              { code: 'F01S03', name: 'To conduct four (4) KAMAA meetings and facilitate the promotion, recategorization, and confirmation of 57 MIT staff by June 2026', budget: 27500000 },
              { code: 'F01S04', name: 'To manage data cleaning process by June 2026', budget: 6400000 },
              { code: 'F01S05', name: 'To facilitate trade attaches in strategic countries by June 2026', budget: 138000000 },
            ],
          },
          { code: 'F03S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 3725455000,
            activities: [
              { code: 'F03S01', name: 'To ensure working equipment and facilities are procured and installed by June 2026', budget: 2560847500 },
              { code: 'F03S02', name: 'To facilitate MIT staff to participate in statutory meetings and national ceremonies by June 2026', budget: 160850000 },
              { code: 'F03S03', name: 'To facilitate department staff to participate in international meetings and seminars by June 2026', budget: 27200000 },
              { code: 'F03S04', name: 'To facilitate eighty (80) MIT staff to participate in Bonanza events and SHIMIWI competition by June 2026', budget: 110500000 },
              { code: 'F03S05', name: 'To facilitate department officials and other operational cadres in performing their routine work by June 2026', budget: 733437500 },
              { code: 'F03S06', name: 'To improve MIT registry services and systems by June 2026', budget: 37300000 },
              { code: 'F03S07', name: 'To facilitate staff to attend professional association meetings and workshops on various skills by June 2026', budget: 37450000 },
              { code: 'F03S08', name: 'To hold two (2) meetings for ministerial training and foreign employment committees by June 2026', budget: 8500000 },
              { code: 'F03S09', name: 'To monitor administration matters at MIT institutions by June 2026', budget: 21800000 },
              { code: 'F03S10', name: 'To monitor human resource matters at MIT institutions by June 2026', budget: 22200000 },
              { code: 'F03S11', name: 'To prevent and monitor the spread of COVID-19 at MIT and its institutions by June 2026', budget: 5370000 },
            ],
          },
          { code: 'F05S', name: 'Employment Policy Operationalized by June 2026', budget: 114275000,
            activities: [
              { code: 'F05S01', name: 'To conduct a training needs assessment and to review and prepare the MIT training program by June 2026', budget: 27925000 },
              { code: 'F05S02', name: 'To train four (4) staff on long courses, ten (10) staff on short courses, and four (4) staff on retirement courses by June 2026', budget: 61400000 },
              { code: 'F05S03', name: 'To conduct an induction course and in-house training for (80) MIT staff by June 2026', budget: 24950000 },
            ],
          },
          { code: 'F06S', name: 'Performance Management Systems implemented by June 2026', budget: 51000000,
            activities: [
              { code: 'F06S01', name: 'To prepare and install the MIT Client Service Charter by June 2026', budget: 51000000 },
            ],
          },
          { code: 'F08S', name: 'Ministry Leaders activities and matters facilitated by June 2026', budget: 1018220000,
            activities: [
              { code: 'F08S01', name: 'To provide statutory and other fringe benefits to entitled staff by June 2026', budget: 962935000 },
              { code: 'F08S02', name: 'To facilitate two (2) MIT leaders to visit parliamentary constituencies by June 2026', budget: 55285000 },
            ],
          },
        ],
      },
    ],
  },

  DPP: {
    subVote: '1003', budget: 2660000000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F02S', name: 'Industry and Trade Parliamentary, Cabinet and Union matters coordinated by June 2026', budget: 224980000,
            activities: [
              { code: 'F02S01', name: 'To facilitate MIT\'s participation in four (4) parliamentary sessions and preparation of responses to forty (40) questions by June 2026', budget: 80320000 },
              { code: 'F02S02', name: 'To facilitate MIT\'s participation in parliamentary committees and coordinate parliamentary field visits by June 2026', budget: 71420000 },
              { code: 'F02S03', name: 'To facilitate MIT\'s participation in meetings with Zanzibar regarding industry and trade union affairs by June 2026', budget: 73240000 },
            ],
          },
          { code: 'F03S', name: 'Policies and Cabinet Papers prepared, analysed and implemented by June 2026', budget: 206420000,
            activities: [
              { code: 'F03S01', name: 'To review and analyze policies and Cabinet papers from other sectors and provide advice by June 2026', budget: 96100000 },
              { code: 'F03S02', name: 'To coordinate the development of two (2) new policies and the review of two (2) MIT policies by June 2026', budget: 104320000 },
              { code: 'F03S03', name: 'To prepare the Ministerial Policies implementation report by June 2026', budget: 6000000 },
            ],
          },
          { code: 'F04S', name: 'Strategic plan, Operational Plans and Performance reports prepared by June 2026', budget: 587410000,
            activities: [
              { code: 'F04S01', name: 'To prepare the MTEF budget framework for FY 2026/2027 by June 2026', budget: 112380000 },
              { code: 'F04S02', name: 'To prepare an Action Plan and Cash flow for FY 2026/2027 by June 2026', budget: 25620000 },
              { code: 'F04S03', name: 'To prepare the Budget Memorandum (RANDAMA) for FY 2026/2027 by June 2026', budget: 105120000 },
              { code: 'F04S04', name: 'To facilitate the preparation of the budget speech for FY 2026/2027 by June 2026', budget: 87500000 },
              { code: 'F04S05', name: 'To prepare quarterly, mid-year, and annual MTEF progress reports by June 2026', budget: 49040000 },
              { code: 'F04S06', name: 'To review the MIT Strategic Plan (SP) 2021/22 - 2025/26 by June 2026', budget: 116750000 },
              { code: 'F04S07', name: 'To coordinate risk management processes within the Ministry by June 2026', budget: 31000000 },
              { code: 'F04S09', name: 'To coordinate budget committee meetings and compile monthly OC and DEV expenditure by June 2026', budget: 60000000 },
            ],
          },
          { code: 'F05S', name: 'MIT Research and Innovation Matters Coordinated by June 2026', budget: 117950000,
            activities: [
              { code: 'F05S01', name: 'To develop guidelines on research and innovation matters and conduct a Ministry service delivery survey by June 2026', budget: 59050000 },
              { code: 'F05S02', name: 'To identify research priority areas for the Ministry by June 2026', budget: 58900000 },
            ],
          },
          { code: 'F06S', name: 'Human Resource Development Plan implemented by June 2026', budget: 66835000,
            activities: [
              { code: 'F06S01', name: 'To train sixteen (16) staff in short courses and two (2) in long courses by June 2026', budget: 66835000 },
            ],
          },
          { code: 'F07S', name: 'DPP Staff Welfare promoted and facilitated by June 2026', budget: 1386245000,
            activities: [
              { code: 'F07S01', name: 'To provide statutory entitlements and hospitality to entitled staff by June 2026', budget: 100240000 },
              { code: 'F07S02', name: 'To procure and conduct routine maintenance and repair of office equipment by June 2026', budget: 1286005000 },
            ],
          },
          { code: 'F08S', name: 'Resource mobilization for MIT Projects conducted and Implemented by June 2026', budget: 70160000,
            activities: [
              { code: 'F08S02', name: 'To facilitate four (4) forums with Development Partners for resource mobilization by June 2026', budget: 39160000 },
              { code: 'F08S03', name: 'To facilitate the preparation of two (2) funding projects by June 2026', budget: 31000000 },
            ],
          },
        ],
      },
    ],
  },

  DID: {
    subVote: '2001', budget: 1707898750,
    objectives: [
      {
        code: 'C', name: 'Industrial performance improved and sustained',
        outputs: [
          { code: 'C01S', name: 'Industrial sector census/research conducted by June 2026', budget: 398950000,
            activities: [
              { code: 'C01S02', name: 'To review and monitor the implementation of strategies and legislations for promoting industrial development by June 2026', budget: 83550000 },
              { code: 'C01S03', name: 'To undertake industrial diagnostic study on priority sub-sectors (Textile, Leather, Cashew nut, Edible Oil etc) by June 2026', budget: 94400000 },
              { code: 'C01S04', name: 'To conduct industrial surveys to develop industrial profile and databanks by June 2026', budget: 143600000 },
              { code: 'C01S05', name: 'To conduct research to assess factors affecting domestic and foreign investors on industries by June 2026', budget: 77400000 },
            ],
          },
          { code: 'C02S', name: 'Quality and productivity through KAIZEN in Tanzania improved by June 2026', budget: 41600000,
            activities: [
              { code: 'C02S01', name: 'To strengthen enterprises through quality and productivity improvements KAIZEN by June 2026', budget: 41600000 },
            ],
          },
          { code: 'C03S', name: 'Industrial Sector Infrastructure developed by June 2026', budget: 204584250,
            activities: [
              { code: 'C03S01', name: 'To conduct Program for Country Partnership (PCP) to facilitate planning strategy by June 2026', budget: 88600000 },
              { code: 'C03S02', name: 'To coordinate and promote development of heavy engineering and machine tools industry by June 2026', budget: 69300000 },
              { code: 'C03S03', name: 'To facilitate Establishment of Tanzania Industrial Master Plan by June 2026', budget: 46684250 },
            ],
          },
          { code: 'C05S', name: 'Industrial Policies and Strategies implemented by June 2026', budget: 217375000,
            activities: [
              { code: 'C05S07', name: 'To finalize National Industrial Policy and Its Strategy by June 2026', budget: 20175000 },
              { code: 'C05S08', name: 'To facilitate and promote development of heavy and light industries by June 2026', budget: 91800000 },
              { code: 'C05S09', name: 'To Review Leather Development Strategy and develop Edible Oil strategy by June 2026', budget: 105400000 },
            ],
          },
          { code: 'C06S', name: 'Industrial consultative platforms strengthened by June 2026', budget: 71335000,
            activities: [
              { code: 'C06S01', name: 'To facilitate department staff participate in regional and international meetings (EAC/SADC/TRIPARTITE and AfCTA) by June 2026', budget: 19400000 },
              { code: 'C06S02', name: 'To facilitate participation in UNIDO conferences by June 2026', budget: 24350000 },
              { code: 'C06S03', name: 'To facilitate implementation of EAC and SADC Industrialization Strategies by June 2026', budget: 14680000 },
              { code: 'C06S04', name: 'To conduct sub-sectoral consultative forum with private sector by June 2026', budget: 12905000 },
            ],
          },
          { code: 'C07S', name: 'Technology transfer and innovation in R&D institutions facilitated by June 2026', budget: 207700000,
            activities: [
              { code: 'C07S01', name: 'To facilitate R&D institutions to support technology transfer and innovation for heavy and light industries by June 2026', budget: 71800000 },
              { code: 'C07S02', name: 'To coordinate industrial research activities related to industries development to LGA by June 2026', budget: 121600000 },
              { code: 'C07S03', name: 'To facilitate and coordinate the implementation of TEMDO, NDC, CAMARTEC, TIRDO projects by June 2026', budget: 14300000 },
            ],
          },
          { code: 'C08S', name: 'Program to promote value addition in light manufacturing industries established by June 2026', budget: 399556000,
            activities: [
              { code: 'C08S01', name: 'To undertake industrial visits and sectoral stakeholders meetings by June 2026', budget: 179500000 },
              { code: 'C08S02', name: 'To monitor and evaluate the performance of light and heavy industries by June 2026', budget: 65200000 },
              { code: 'C08S03', name: 'To commemorate Africa Industrialization Day (AID), National Industrial exhibition and SADC Industrialization week by June 2026', budget: 106321000 },
              { code: 'C08S04', name: 'To conduct industrial intelligence and value chain analysis for local and export products by June 2026', budget: 25435000 },
              { code: 'C08S05', name: 'To conduct industrial intelligence and value chain analysis (second round) by June 2026', budget: 23100000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'Human Resources development plan implemented by June 2026', budget: 28000000,
            activities: [
              { code: 'F01C01', name: 'To facilitate short and long term course for six (6) members of staff by June 2026', budget: 28000000 },
            ],
          },
          { code: 'F01S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 108518500,
            activities: [
              { code: 'F01S01', name: 'To provide statutory allowances, leave travel and other fringe benefits to entitled officers by June 2026', budget: 108518500 },
            ],
          },
          { code: 'F02S', name: 'Working Facilities Provided by June 2026', budget: 30280000,
            activities: [
              { code: 'F02S01', name: 'To extend hospitality and staff welfare by June 2026', budget: 10000000 },
              { code: 'F02S02', name: 'To ensure efficient running of departmental offices by June 2026', budget: 20280000 },
            ],
          },
        ],
      },
    ],
  },

  DTD: {
    subVote: '4002', budget: 2010260000,
    objectives: [
      {
        code: 'D', name: 'Business environment improved',
        outputs: [
          { code: 'D01S', name: 'Business licensing legal and regulatory framework Reviewed and implemented by June 2026', budget: 484100000,
            activities: [
              { code: 'D01S01', name: 'To organise conferences and meetings for gathering and resolving technical challenges faced by businessmen by June 2026', budget: 300010000 },
              { code: 'D01S02', name: 'To identify, review and improve the business type fee matrix by June 2026', budget: 24040000 },
              { code: 'D01S03', name: 'To promote trade through the use of Digital Marketing by June 2026', budget: 30000000 },
              { code: 'D01S04', name: 'To organise Ministerial Public-Private Sectors Discussion (MPPDs) by June 2026', budget: 50050000 },
              { code: 'D01S05', name: 'To conduct inspection of business licenses and promote trade formalization by June 2026', budget: 80000000 },
            ],
          },
          { code: 'D04S', name: 'National Export Strategy Developed and Implemented by June 2026', budget: 25062000,
            activities: [
              { code: 'D04S01', name: 'To monitor and coordinate the implementation of NES by June 2026', budget: 25062000 },
            ],
          },
        ],
      },
      {
        code: 'E', name: 'Trade and market competitiveness enhanced',
        outputs: [
          { code: 'E01C', name: 'Market promotion Programme developed and implemented by June 2026', budget: 458373000,
            activities: [
              { code: 'E01C03', name: 'To strengthen and promote formalization of Cross Border Trade by June 2026', budget: 30793000 },
              { code: 'E01C04', name: 'To coordinate the Dar-es-Salaam International trade fair (DITF) by June 2026', budget: 100000000 },
              { code: 'E01C05', name: 'To coordinate participation in Nane Nane exhibition to promote agricultural and industrial products by June 2026', budget: 50000000 },
              { code: 'E01C06', name: 'To facilitate participation in International trade fairs, Exhibitions, and trade missions by June 2026', budget: 200000000 },
              { code: 'E01C07', name: 'To promote the use of locally produced goods in the domestic market by June 2026', budget: 27590000 },
              { code: 'E01C08', name: 'To conduct market intelligence for agricultural and industrial products by June 2026', budget: 49990000 },
            ],
          },
          { code: 'E01S', name: 'Integrated Market information system upgraded by June 2026', budget: 124680000,
            activities: [
              { code: 'E01S01', name: 'To collect, analyze, archive and disseminate market information of commodities by June 2026', budget: 124680000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'Human Resource development Plan implemented by June 2026', budget: 30000000,
            activities: [
              { code: 'F01C01', name: 'To train two (2) staff in long courses and three (3) in short courses by June 2026', budget: 30000000 },
            ],
          },
          { code: 'F01S', name: 'Statutory entitlements and hospitality facilitated by June 2026', budget: 362305000,
            activities: [
              { code: 'F01S01', name: 'To extend hospitality and staff welfare by June 2026', budget: 121725000 },
              { code: 'F01S02', name: 'To provide statutory allowances to entitled staff by June 2026', budget: 140580000 },
              { code: 'F01S03', name: 'To procure office equipment and stationaries by June 2026', budget: 100000000 },
            ],
          },
          { code: 'F03S', name: 'Budget subventions to MIT Institutions provided by June 2026', budget: 525740000,
            activities: [
              { code: 'F03S01', name: 'To provide OC subvention to MIT Institutions by June 2026', budget: 525740000 },
            ],
          },
        ],
      },
    ],
  },

  DSME: {
    subVote: '2002', budget: 1009550000,
    objectives: [
      {
        code: 'C', name: 'Industrial performance improved and sustained',
        outputs: [
          { code: 'C04S', name: 'SMEs infrastructure development facilitated by June 2026', budget: 229352000,
            activities: [
              { code: 'C04S01', name: 'To coordinate development of MSMEs industrial clusters by June 2026', budget: 128102000 },
              { code: 'C04S02', name: 'To promote LGAs to allocate and develop land for MSMEs activities by June 2026', budget: 101250000 },
            ],
          },
        ],
      },
      {
        code: 'D', name: 'Business environment improved',
        outputs: [
          { code: 'D01C', name: 'SMEs Development Policy reviewed and implemented by June 2026', budget: 125550000,
            activities: [
              { code: 'D01C01', name: 'To finalize the review of SME Development Policy (2003) by June 2026', budget: 125550000 },
            ],
          },
          { code: 'D12S', name: 'Mechanism to enable SMEs access to financial services developed by June 2026', budget: 79750000,
            activities: [
              { code: 'D12S01', name: 'To create awareness about various Schemes providing loans to SMEs by June 2026', budget: 79750000 },
            ],
          },
          { code: 'D14S', name: 'Framework for SMEs business formalization developed and implemented by June 2026', budget: 176747500,
            activities: [
              { code: 'D14S01', name: 'To promote business formalization of informal enterprises by June 2026', budget: 102997500 },
              { code: 'D14S02', name: 'To assess the performance of SIDO and other Ministry based Institutions in delivering services for SMEs by June 2026', budget: 73750000 },
            ],
          },
        ],
      },
      {
        code: 'E', name: 'Trade and market competitiveness enhanced',
        outputs: [
          { code: 'E01C', name: 'Mechanism for improving SMEs products competitiveness established by June 2026', budget: 135600000,
            activities: [
              { code: 'E01C01', name: 'To facilitate SMEs to access regional and international market opportunities by June 2026', budget: 135600000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F07S', name: 'Human Resource development Plan implemented by June 2026', budget: 60100000,
            activities: [
              { code: 'F07S01', name: 'To train one member of staff in long course and 3 in short courses by June 2026', budget: 22100000 },
              { code: 'F07S02', name: 'To ensure efficient running of departmental offices by June 2026', budget: 38000000 },
            ],
          },
          { code: 'F09S', name: 'Statutory Entitlement and hospitality facilitated by June 2026', budget: 83800500,
            activities: [
              { code: 'F09S01', name: 'To provide statutory requirements to entitled staff by June 2026', budget: 72300500 },
              { code: 'F09S02', name: 'To extend hospitality and staff welfare by June 2026', budget: 11500000 },
            ],
          },
        ],
      },
      {
        code: 'Y', name: 'Multi-Sectoral Nutritional Services Improved',
        outputs: [
          { code: 'Y01S', name: 'MSMEs and Food Processors engaged in food fortification increased to 20% by June 2026', budget: 118650000,
            activities: [
              { code: 'Y01S01', name: 'To conduct sensitization meetings to MSMEs and food Industries on use of technologies for food processing and fortification by June 2026', budget: 118650000 },
            ],
          },
        ],
      },
    ],
  },

  DTI: {
    subVote: '3001', budget: 1800000000,
    objectives: [
      {
        code: 'D', name: 'Business environment improved',
        outputs: [
          { code: 'D01S', name: 'National NTBs Strategy developed and implemented by June 2026', budget: 45410000,
            activities: [
              { code: 'D01S01', name: 'To conduct stockholders meetings on the development of the National NTBs Elimination Strategy by June 2026', budget: 22370000 },
              { code: 'D01S02', name: 'To coordinate and conduct stakeholders awareness on the National NTBs Elimination Strategy by June 2026', budget: 23040000 },
            ],
          },
        ],
      },
      {
        code: 'E', name: 'Trade and market competitiveness enhanced',
        outputs: [
          { code: 'E01S', name: 'Bilateral, Regional and Multilateral Negotiations Concluded by June 2026', budget: 543885000,
            activities: [
              { code: 'E01S01', name: 'To negotiate market access in EAC, AfCTA, TFTA, and SADC by June 2026', budget: 352335000 },
              { code: 'E01S02', name: 'To create stakeholders awareness of market access opportunities (EAC, AfCFTA, TFTA, AGOA, SADC) by June 2026', budget: 65500000 },
              { code: 'E01S03', name: 'To conduct market surveillance in South Sudan and Somalia by June 2026', budget: 91750000 },
              { code: 'E01S04', name: 'To participate in negotiations for the finalization of EAC Tariff Offer reduction by June 2026', budget: 34300000 },
            ],
          },
          { code: 'E02S', name: 'Implementation of WTO Agreements by June 2026', budget: 222040000,
            activities: [
              { code: 'E02S01', name: 'To coordinate and participate in TFA, agriculture, trade in service, TBT, and SPS committee meetings by June 2026', budget: 90040000 },
              { code: 'E02S02', name: 'To undertake stakeholders meetings/workshops on WTO Fisheries Agreement Subsidies by June 2026', budget: 132000000 },
            ],
          },
          { code: 'E03S', name: 'National Trade Facilitation committees including NMC for NTBs coordinated by June 2026', budget: 193070000,
            activities: [
              { code: 'E03S01', name: 'To participate in four (4) meetings on the elimination of NTBs by June 2026', budget: 36620000 },
              { code: 'E03S02', name: 'To conduct four (4) TBT & SPS National Committee meetings by June 2026', budget: 45500000 },
              { code: 'E03S03', name: 'To participate in two (2) National Common Market meetings by June 2026', budget: 25500000 },
              { code: 'E03S04', name: 'To undertake NTBs surveillance in Northern Corridor by June 2026', budget: 30450000 },
              { code: 'E03S05', name: 'To conduct four (4) TF National Committee meetings by June 2026', budget: 55000000 },
            ],
          },
          { code: 'E04S', name: 'Trade Remedies Act enacted and Implemented by June 2026', budget: 89300000,
            activities: [
              { code: 'E04S01', name: 'To facilitate two (2) meetings to prepare regulations of the Trade Remedies Act by June 2026', budget: 54650000 },
              { code: 'E04S02', name: 'To facilitate four (4) meetings on the creation of awareness of Trade Remedies Act by June 2026', budget: 34650000 },
            ],
          },
          { code: 'E05S', name: 'Conclusion of Bilateral Trade negotiations by June 2026', budget: 263100000,
            activities: [
              { code: 'E05S01', name: 'To conduct ongoing and outgoing trade missions and business forums in strategic countries by June 2026', budget: 44000000 },
              { code: 'E05S02', name: 'To coordinate and participate in Joint Trade Committee (JTC) and Joint Permanent Commission (JPC) by June 2026', budget: 60200000 },
              { code: 'E05S03', name: 'To coordinate a stakeholders meeting to formulate an MoU and trade agreement by June 2026', budget: 32000000 },
              { code: 'E05S04', name: 'To coordinate and participate in AGOA Forums by June 2026', budget: 80400000 },
              { code: 'E05S05', name: 'To coordinate and participate in URT-US commercial dialogues by June 2026', budget: 46500000 },
            ],
          },
          { code: 'E06S', name: 'National Trade Policy of 2003 reviewed and implemented by June 2026', budget: 130200000,
            activities: [
              { code: 'E06S01', name: 'To create stakeholders awareness of NTP 2023 by June 2026', budget: 42400000 },
              { code: 'E06S02', name: 'To establish the Trade Act by June 2026', budget: 45400000 },
              { code: 'E06S03', name: 'To establish and operationalize the National Trade Committee by June 2026', budget: 42400000 },
            ],
          },
          { code: 'E07S', name: 'E-Commerce Strategy Developed and Implemented by June 2026', budget: 86572000,
            activities: [
              { code: 'E07S01', name: 'To create awareness and build capacity of stakeholders on E-Commerce Strategy by June 2026', budget: 31000000 },
              { code: 'E07S02', name: 'To participate in regional and international E-Commerce (Digital) forums by June 2026', budget: 55572000 },
            ],
          },
          { code: 'E08S', name: 'Implementation of AfCFTA Strategy by June 2026', budget: 82450000,
            activities: [
              { code: 'E08S01', name: 'To create awareness and build capacity of stakeholders to trade under AfCFTA by June 2026', budget: 58350000 },
              { code: 'E08S02', name: 'To establish the AfCFTA committee and operationalize by June 2026', budget: 24100000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'Training and Development Programs reviewed by June 2026', budget: 54223000,
            activities: [
              { code: 'F01C01', name: 'To facilitate six (6) DTI staff to attend training, long-term and short-term by June 2026', budget: 54223000 },
            ],
          },
          { code: 'F03S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 89750000,
            activities: [
              { code: 'F03S01', name: 'To procure office equipment and stationery by June 2026', budget: 22500000 },
              { code: 'F03S02', name: 'To provide statutory allowances to entitled staff by June 2026', budget: 54750000 },
              { code: 'F03S03', name: 'To extend hospitality and staff welfare by June 2026', budget: 12500000 },
            ],
          },
        ],
      },
    ],
  },

  FAU: {
    subVote: '1002', budget: 473750000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'Human Resource Development Plan implemented by June 2026', budget: 58600000,
            activities: [
              { code: 'F01C01', name: 'To support 2 finance staff for long and 4 for short-term training by June 2026', budget: 24600000 },
              { code: 'F01C02', name: 'To facilitate 7 Finance staff to participate in International and Domestic Professional Conferences by June 2026', budget: 34000000 },
            ],
          },
          { code: 'F01S', name: 'MIT Staff welfare promoted and facilitated by June 2026', budget: 191755000,
            activities: [
              { code: 'F01S01', name: 'To prepare Salary deductions and pay salaries to Ministry staff monthly by June 2026', budget: 70175000 },
              { code: 'F01S02', name: 'To provide statutory allowance and other fringe benefits to entitled staff by June 2026', budget: 121580000 },
            ],
          },
          { code: 'F02S', name: 'Financial Management Systems implemented by June 2026', budget: 223395000,
            activities: [
              { code: 'F02S01', name: 'To reply and follow up of external and internal audit queries and management letter by June 2026', budget: 59550000 },
              { code: 'F02S02', name: 'To prepare financial statements by June 2026', budget: 63320000 },
              { code: 'F02S03', name: 'To prepare monthly and quarterly financial reports by June 2026', budget: 46700000 },
              { code: 'F02S04', name: 'To execute daily payments and receipts of Public funds by June 2026', budget: 30575000 },
              { code: 'F02S05', name: 'To create awareness on Finance and public accounting standard to MIT staff by June 2026', budget: 9050000 },
              { code: 'F02S06', name: 'To facilitate Finance staff to control disbursement and receipts to MIT Institutions by June 2026', budget: 14200000 },
            ],
          },
        ],
      },
    ],
  },

  PMU: {
    subVote: '1008', budget: 453619250,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'Human Resource Development Plan implemented by June 2026', budget: 73270000,
            activities: [
              { code: 'F01C01', name: 'To train six (6) PMU staff and seven (7) Tender Board Members on Procurement Act and e-Procurement by June 2026', budget: 73270000 },
            ],
          },
          { code: 'F01S', name: 'Ministerial procurement service provided by June 2026', budget: 262269250,
            activities: [
              { code: 'F01S03', name: 'To prepare Annual Procurement Plan and advertise the General Procurement Notice by June 2026', budget: 34750000 },
              { code: 'F01S04', name: 'To conduct four (4) Tender board meetings and five (5) Evaluation meetings by June 2026', budget: 37700000 },
              { code: 'F01S05', name: 'To conduct Annual Stocktaking by June 2026', budget: 25750000 },
              { code: 'F01S06', name: 'To procure working equipment and regular office supplies by June 2026', budget: 125779250 },
              { code: 'F01S07', name: 'To conduct physical verification, codification and disposal of Ministry\'s assets by June 2026', budget: 38290000 },
            ],
          },
          { code: 'F02S', name: 'Working Facilities Provided by June 2026', budget: 118080000,
            activities: [
              { code: 'F02S01', name: 'To provide statutory allowance and staff welfare by June 2026', budget: 118080000 },
            ],
          },
        ],
      },
    ],
  },

  LSU: {
    subVote: '1006', budget: 465307000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'Human Resources Development programmes plan implemented by June 2026', budget: 20557000,
            activities: [
              { code: 'F01C02', name: 'To facilitate One (01) staff to attend long course and One (01) to attend short course by June 2026', budget: 20557000 },
            ],
          },
          { code: 'F03S', name: 'MIT staff welfare promoted and facilitated by June 2026', budget: 183730000,
            activities: [
              { code: 'F03S02', name: 'To provide statutory entitlements and hospitality to Legal Unit Staff by June 2026', budget: 78580000 },
              { code: 'F03S03', name: 'To ensure efficient running of Legal Unit by June 2026', budget: 105150000 },
            ],
          },
          { code: 'F04S', name: 'Legal Services provided by June 2026', budget: 261020000,
            activities: [
              { code: 'F04S06', name: 'To negotiate Trade related contracts in regional and multilateral levels by June 2026', budget: 77140000 },
              { code: 'F04S07', name: 'To draft 15 Industrial and Trade service contracts by June 2026', budget: 45800000 },
              { code: 'F04S08', name: 'To review Five (05) Trade related laws by June 2026', budget: 57380000 },
              { code: 'F04S09', name: 'To represent the Ministry in litigation, Disciplinary cases and in prosecution by June 2026', budget: 50400000 },
              { code: 'F04S10', name: 'To translate into Swahili Language Six (06) Industry and Trade related laws by June 2026', budget: 30300000 },
            ],
          },
        ],
      },
    ],
  },

  ICTU: {
    subVote: '1007', budget: 492500000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'Human Resources Development Plan implemented by June 2026', budget: 68497000,
            activities: [
              { code: 'F01C01', name: 'To participate in ICT professional meetings, conferences, workshops, and other seminars by June 2026', budget: 19500000 },
              { code: 'F01C02', name: 'To facilitate ICT Unit staff to undertake long term and short term courses by June 2026', budget: 19997000 },
              { code: 'F01C03', name: 'To conduct ICT awareness training and capacity building on MIT staff by June 2026', budget: 29000000 },
            ],
          },
          { code: 'F01S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 76703000,
            activities: [
              { code: 'F01S01', name: 'To provide statutory allowance and other fringe benefits to entitled staff by June 2026', budget: 76703000 },
            ],
          },
          { code: 'F02S', name: 'ICT services delivered by June 2026', budget: 347300000,
            activities: [
              { code: 'F02S01', name: 'To strengthen LAN, Internet, email, and computer systems by June 2026', budget: null },
              { code: 'F02S02', name: 'To develop and maintain industrial databases and the MIT data warehouse by June 2026', budget: 94000000 },
              { code: 'F02S03', name: 'To facilitate and oversee ICT governance and policy framework by June 2026', budget: 45150000 },
              { code: 'F02S04', name: 'To maintain ICT infrastructure and equipment by June 2026', budget: 27220000 },
            ],
          },
        ],
      },
    ],
  },

  GCU: {
    subVote: '1004', budget: 480000000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'Human Resource development Plan implemented by June 2026', budget: 147735000,
            activities: [
              { code: 'F01C01', name: 'To train one (1) communication officer in a long-term course and two (2) short-term courses by June 2026', budget: 17025000 },
              { code: 'F01C02', name: 'To attend local and international professional meetings, seminars, and workshops by June 2026', budget: 130710000 },
            ],
          },
          { code: 'F02S', name: 'Industry and Trade Communication Strategy Developed and Implemented by June 2026', budget: 278645000,
            activities: [
              { code: 'F02S01', name: 'To produce, disseminate, sensitize, and advocate MIT activities and programs by June 2026', budget: 176800000 },
              { code: 'F02S02', name: 'To ensure the efficient functioning of GCU and library services by June 2026', budget: 101845000 },
            ],
          },
          { code: 'F03S', name: 'MIT staff welfare promoted and facilitated by June 2026', budget: 53620000,
            activities: [
              { code: 'F03S01', name: 'To extend hospitality and facilitate staff welfare by June 2026', budget: 34690000 },
              { code: 'F03S02', name: 'To provide statutory allowances to entitled staff by June 2026', budget: 18930000 },
            ],
          },
        ],
      },
    ],
  },

  IAU: {
    subVote: '1005', budget: 455000000,
    objectives: [
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'Human Resource development Plan implemented by June 2026', budget: 228400000,
            activities: [
              { code: 'F01C01', name: 'To train two (2) staff, one (1) on short course and one (1) on long course by June 2026', budget: 50000000 },
              { code: 'F01C02', name: 'To facilitate Internal Audit Staff to attend Professional Forums by June 2026', budget: 10800000 },
              { code: 'F01C03', name: 'To provide statutory allowance and other fringe benefits to entitled staff by June 2026', budget: 18080000 },
              { code: 'F01C05', name: 'To extend hospitality and staff welfare by June 2026', budget: 145020000 },
              { code: 'F01C06', name: 'To ensure efficient running of departmental offices by June 2026', budget: 4500000 },
            ],
          },
          { code: 'F01S', name: 'Internal controls and Governance system implemented by June 2026', budget: 111450000,
            activities: [
              { code: 'F01S01', name: 'To conduct one (1) awareness training to Audit Committee members and facilitation of 4 audit committee meetings by June 2026', budget: 81680000 },
              { code: 'F01S02', name: 'To prepare the Internal Audit Annual Plan, review Internal Audit Charter and Audit Committee Charter by June 2026', budget: 3300000 },
              { code: 'F01S03', name: 'To review key audit findings and recommend on appropriate action by June 2026', budget: 3100000 },
              { code: 'F01S04', name: 'To conduct audit and submit four (4) consolidated Internal Audit Reports by June 2026', budget: 12200000 },
              { code: 'F01S05', name: 'To prepare the Three Years Risk Based Internal Audit Plan by June 2026', budget: 11170000 },
            ],
          },
          { code: 'F03S', name: 'MIT ISOs, Development Projects and MIT Departments and Units audited by June 2026', budget: 115150000,
            activities: [
              { code: 'F03S01', name: 'To identify, evaluate and document sufficient information on audit of Projects (Field work) by June 2026', budget: 24500000 },
              { code: 'F03S02', name: 'To conduct audit to the ISOs and Projects under the Ministry by June 2026', budget: 59800000 },
              { code: 'F03S03', name: 'To follow up reported audit finding by June 2026', budget: 18000000 },
              { code: 'F03S04', name: 'To conduct performance audit to the Ministry\'s ISOs by June 2026', budget: 12850000 },
            ],
          },
        ],
      },
    ],
  },

  MEU: {
    subVote: '1009', budget: 473432000,
    objectives: [
      {
        code: 'D', name: 'Business environment improved',
        outputs: [
          { code: 'D01S', name: 'Ministerial M&E Framework developed and implemented by June 2026', budget: 80420000,
            activities: [
              { code: 'D01S01', name: 'To prepare and track the implementation of the 2025/26 Annual Evaluation Plan by June 2026', budget: 42120000 },
              { code: 'D01S02', name: 'To facilitate department staff to participate in M&E regional and international meetings by June 2026', budget: 38300000 },
            ],
          },
        ],
      },
      {
        code: 'F', name: 'Ministry capacity to deliver mandated functions improved',
        outputs: [
          { code: 'F01C', name: 'M&E Human Resource Development Plan implemented by June 2026', budget: 56300000,
            activities: [
              { code: 'F01C01', name: 'To train four (4) staff in short courses and one (1) in long courses by June 2026', budget: 44700000 },
              { code: 'F01C02', name: 'To facilitate M&E staff to participate in the M&E week conference by June 2026', budget: 11600000 },
            ],
          },
          { code: 'F01S', name: 'MIT Staff Welfare promoted and facilitated by June 2026', budget: 55126000,
            activities: [
              { code: 'F01S01', name: 'To provide statutory entitlements, and hospitality to entitled staff by June 2026', budget: 35080000 },
              { code: 'F01S02', name: 'To procure and conduct routine maintenance and repair of office equipment by June 2026', budget: 20046000 },
            ],
          },
          { code: 'F02S', name: 'Ministerial Statistical database established and utilized by June 2026', budget: 29250000,
            activities: [
              { code: 'F02S01', name: 'To conduct baseline surveys for new indicators of SDGs by June 2026', budget: 15800000 },
              { code: 'F02S02', name: 'To prepare the Statistical Book and update the MIT Statistical Profile annually by June 2026', budget: 13450000 },
            ],
          },
          { code: 'F03S', name: 'Evaluation Effectiveness Assessment by June 2026', budget: 252336000,
            activities: [
              { code: 'F03S01', name: 'To monitor and evaluate the implementation of the Ruling Party Manifesto and Government Directives by June 2026', budget: 17100000 },
              { code: 'F03S02', name: 'To monitor and evaluate the implementation of the policy, Strategic Plan, annual plans, budget, programs, and projects by June 2026', budget: 97336000 },
              { code: 'F03S03', name: 'To conduct monitoring and verification of Controller and Auditor General (CAG) recommendations quarterly by June 2026', budget: 31500000 },
              { code: 'F03S04', name: 'To prepare the Ministry\'s Annual Performance Report and other reports by June 2026', budget: 46000000 },
              { code: 'F03S05', name: 'To conduct quarterly M&E Meetings by June 2026', budget: 35000000 },
              { code: 'F03S06', name: 'To evaluate the implementation of directives by boards of institutions under the Ministry by June 2026', budget: 25400000 },
            ],
          },
        ],
      },
    ],
  },
};

// Structured dept/unit navigation list
export const MIT_STRUCTURE = {
  departments: [
    { code: 'DAHRM', name: 'Department of Administration and Human Resource Management', subVote: '1001' },
    { code: 'DID',   name: 'Department of Industrial Development',                       subVote: '2001' },
    { code: 'DPP',   name: 'Department of Policy and Planning',                          subVote: '1003' },
    { code: 'DTD',   name: 'Department of Trade and Development',                        subVote: '4002' },
    { code: 'DSME',  name: 'Department of Small and Medium Enterprises',                 subVote: '2002' },
    { code: 'DTI',   name: 'Department of Trade Integration',                            subVote: '3001' },
  ],
  units: [
    { code: 'FAU',  name: 'Finance and Accounting Unit',                    subVote: '1002' },
    { code: 'PMU',  name: 'Procurement Management Unit',                    subVote: '1008' },
    { code: 'LSU',  name: 'Legal Services Unit',                            subVote: '1006' },
    { code: 'ICTU', name: 'Information Communication and Technology Unit',  subVote: '1007' },
    { code: 'GCU',  name: 'Government Communication Unit',                  subVote: '1004' },
    { code: 'IAU',  name: 'Internal Audit Unit',                            subVote: '1005' },
    { code: 'MEU',  name: 'Monitoring and Evaluation Unit',                 subVote: '1009' },
  ],
};
